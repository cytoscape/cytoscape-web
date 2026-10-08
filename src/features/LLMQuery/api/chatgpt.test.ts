// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { ctorSpy, createSpy, listSpy } = vi.hoisted(() => ({
  ctorSpy: vi.fn(),
  createSpy: vi.fn(),
  listSpy: vi.fn(),
}))

vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: createSpy } }
    models = { list: listSpy }
    constructor(opts: unknown) {
      ctorSpy(opts)
    }
  },
}))

import { analyzeSubsystemGeneSet, listLLMModels } from './chatgpt'

describe('analyzeSubsystemGeneSet', () => {
  beforeEach(() => {
    ctorSpy.mockReset()
    createSpy.mockReset()
    createSpy.mockResolvedValue({
      choices: [{ message: { content: 'answer' } }],
    })
  })

  it('talks to OpenAI by default without overriding the base URL', async () => {
    const result = await analyzeSubsystemGeneSet('hi', {
      apiKey: 'sk-abc',
      model: 'gpt-4o-mini',
      baseUrl: '',
    })

    expect(result).toBe('answer')
    expect(ctorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'sk-abc',
        dangerouslyAllowBrowser: true,
      }),
    )
    expect(ctorSpy.mock.calls[0][0]).not.toHaveProperty('baseURL')
    expect(createSpy).toHaveBeenCalledWith({
      messages: [{ role: 'user', content: 'hi' }],
      model: 'gpt-4o-mini',
    })
  })

  it('routes to a local Ollama endpoint with a placeholder key when none is set', async () => {
    await analyzeSubsystemGeneSet('hi', {
      apiKey: '',
      model: 'llama3.1',
      baseUrl: 'http://localhost:11434/v1',
    })

    const opts = ctorSpy.mock.calls[0][0]
    expect(opts.baseURL).toBe('http://localhost:11434/v1')
    expect(typeof opts.apiKey).toBe('string')
    expect(opts.apiKey).not.toBe('')
  })
})

describe('endpoint safety', () => {
  beforeEach(() => {
    ctorSpy.mockReset()
    createSpy.mockReset()
  })

  it('refuses to send a key over plain HTTP to a non-loopback host', async () => {
    await expect(
      analyzeSubsystemGeneSet('hi', {
        apiKey: 'secret',
        model: 'm',
        baseUrl: 'http://llm.example.org/v1',
      }),
    ).rejects.toThrow(/https/i)

    expect(ctorSpy).not.toHaveBeenCalled()
    expect(createSpy).not.toHaveBeenCalled()
  })

  it('still sends the key to an HTTPS endpoint', async () => {
    createSpy.mockResolvedValue({ choices: [{ message: { content: 'ok' } }] })

    await analyzeSubsystemGeneSet('hi', {
      apiKey: 'secret',
      model: 'm',
      baseUrl: 'https://llm.example.org/v1',
    })

    expect(ctorSpy.mock.calls[0][0].apiKey).toBe('secret')
  })
})

describe('listLLMModels', () => {
  beforeEach(() => {
    ctorSpy.mockReset()
    listSpy.mockReset()
  })

  it('returns the ids reported by the endpoint, sorted', async () => {
    listSpy.mockReturnValue(
      (async function* () {
        yield { id: 'qwen2.5' }
        yield { id: 'llama3.1' }
      })(),
    )

    const ids = await listLLMModels({
      apiKey: '',
      baseUrl: 'http://localhost:11434/v1',
    })

    expect(ids).toEqual(['llama3.1', 'qwen2.5'])
    expect(ctorSpy.mock.calls[0][0].baseURL).toBe('http://localhost:11434/v1')
  })
})
