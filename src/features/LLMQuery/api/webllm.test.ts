// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { webLLMAppConfig } from '../model/WebLLMModel'
import {
  chatWithWebLLM,
  getWebLLMModelId,
  loadWebLLMModel,
  unloadWebLLMModel,
} from './webllm'

const QWEN = 'Qwen2.5-3B-Instruct-q4f16_1-MLC'
const LLAMA = 'Llama-3.2-3B-Instruct-q4f16_1-MLC'

const engine = vi.hoisted(() => ({
  instances: [] as any[],
  reload: vi.fn(async (_modelId: string) => {}),
  create: vi.fn(
    async (_request: unknown): Promise<any> => ({
      choices: [{ message: { content: 'answer' } }],
    }),
  ),
}))

vi.mock('@mlc-ai/web-llm', () => ({
  WebWorkerMLCEngine: class {
    readonly worker: unknown
    readonly config: any
    readonly chat = { completions: { create: engine.create } }
    constructor(worker: unknown, config: unknown) {
      this.worker = worker
      this.config = config
      engine.instances.push(this)
    }
    reload(modelId: string) {
      return engine.reload(modelId)
    }
  },
}))

class FakeWorker {
  static created: FakeWorker[] = []
  terminated = false
  constructor(
    readonly url: URL,
    readonly options: unknown,
  ) {
    FakeWorker.created.push(this)
  }
  terminate() {
    this.terminated = true
  }
}

describe('WebLLM engine session', () => {
  beforeEach(() => {
    FakeWorker.created = []
    engine.instances = []
    engine.reload.mockReset().mockResolvedValue(undefined)
    engine.create.mockReset().mockResolvedValue({
      choices: [{ message: { content: 'answer' } }],
    })
    vi.stubGlobal('Worker', FakeWorker)
  })

  afterEach(() => {
    unloadWebLLMModel()
    vi.unstubAllGlobals()
  })

  it('refuses a model outside the curated list without starting a worker', async () => {
    await expect(loadWebLLMModel('gpt-6-luna', () => {})).rejects.toThrow(
      /not a WebLLM model/,
    )
    expect(FakeWorker.created).toHaveLength(0)
  })

  it('loads in a module worker with only the curated models configured', async () => {
    await loadWebLLMModel(QWEN, () => {})

    expect(FakeWorker.created).toHaveLength(1)
    expect(FakeWorker.created[0].options).toEqual({ type: 'module' })
    expect(FakeWorker.created[0].url.pathname).toMatch(/webllm\.worker\.ts$/)
    expect(engine.instances[0].config.appConfig).toBe(webLLMAppConfig)
    expect(engine.reload).toHaveBeenCalledWith(QWEN)
    expect(getWebLLMModelId()).toBe(QWEN)
  })

  it('reuses the load for the same model', async () => {
    await Promise.all([
      loadWebLLMModel(QWEN, () => {}),
      loadWebLLMModel(QWEN, () => {}),
    ])
    expect(FakeWorker.created).toHaveLength(1)
    expect(engine.reload).toHaveBeenCalledTimes(1)
  })

  it('terminates the old worker when another model is requested', async () => {
    await loadWebLLMModel(QWEN, () => {})
    await loadWebLLMModel(LLAMA, () => {})

    expect(FakeWorker.created).toHaveLength(2)
    expect(FakeWorker.created[0].terminated).toBe(true)
    expect(FakeWorker.created[1].terminated).toBe(false)
    expect(getWebLLMModelId()).toBe(LLAMA)
  })

  it('forwards progress only from the current session', async () => {
    const first = vi.fn()
    const second = vi.fn()
    await loadWebLLMModel(QWEN, first)
    await loadWebLLMModel(LLAMA, second)

    const report = { progress: 0.5, timeElapsed: 1, text: 'Fetching' }
    engine.instances[0].config.initProgressCallback(report)
    engine.instances[1].config.initProgressCallback(report)

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith({ progress: 0.5, text: 'Fetching' })
  })

  it('drops a session whose load failed, so the next attempt starts fresh', async () => {
    engine.reload.mockRejectedValueOnce(new Error('IntegrityError'))
    await expect(loadWebLLMModel(QWEN, () => {})).rejects.toThrow(
      'IntegrityError',
    )
    expect(FakeWorker.created[0].terminated).toBe(true)
    expect(getWebLLMModelId()).toBeUndefined()

    await loadWebLLMModel(QWEN, () => {})
    expect(FakeWorker.created).toHaveLength(2)
  })

  it('sends one user message to the loaded model', async () => {
    await loadWebLLMModel(QWEN, () => {})
    await expect(chatWithWebLLM('genes: A, B', QWEN)).resolves.toBe('answer')
    expect(engine.create).toHaveBeenCalledWith({
      messages: [{ role: 'user', content: 'genes: A, B' }],
      model: QWEN,
    })
  })

  it('refuses to query a model that is not loaded', async () => {
    await expect(chatWithWebLLM('hi', QWEN)).rejects.toThrow(/not loaded/)
    await loadWebLLMModel(QWEN, () => {})
    await expect(chatWithWebLLM('hi', LLAMA)).rejects.toThrow(/not loaded/)
  })

  it('explains a prompt longer than the context window', async () => {
    await loadWebLLMModel(QWEN, () => {})
    engine.create.mockRejectedValueOnce(
      new Error(
        'Prompt tokens exceed context window size: number of prompt tokens: 5000; context window size: 4096',
      ),
    )
    await expect(chatWithWebLLM('long', QWEN)).rejects.toThrow(
      /too long for the in-browser model/,
    )
    // The engine is still usable
    expect(getWebLLMModelId()).toBe(QWEN)
  })

  it('drops the engine when the GPU device is lost', async () => {
    await loadWebLLMModel(QWEN, () => {})
    engine.create.mockRejectedValueOnce(
      new Error('The WebGPU device was lost while loading the model.'),
    )
    await expect(chatWithWebLLM('hi', QWEN)).rejects.toThrow(/out of memory/)
    expect(FakeWorker.created[0].terminated).toBe(true)
    expect(getWebLLMModelId()).toBeUndefined()
  })

  it('returns an empty answer when the model sends no content', async () => {
    await loadWebLLMModel(QWEN, () => {})
    engine.create.mockResolvedValueOnce({ choices: [] })
    await expect(chatWithWebLLM('hi', QWEN)).resolves.toBe('')
  })
})
