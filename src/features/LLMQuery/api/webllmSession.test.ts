// @vitest-environment node
import { act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useMessageStore } from '../../../data/hooks/stores/MessageStore'
import { MessageSeverity } from '../../../models/MessageModel'
import { useLLMQueryStore } from '../store'
import {
  chatWithWebLLM,
  getWebLLMModelId,
  loadWebLLMModel,
  unloadWebLLMModel,
  WebLLMLoadProgress,
} from './webllm'
import {
  getWebLLMBlocker,
  queryWebLLM,
  startWebLLMModelLoad,
  stopWebLLM,
} from './webllmSession'

vi.mock('./webllm', () => ({
  loadWebLLMModel: vi.fn(),
  chatWithWebLLM: vi.fn(),
  getWebLLMModelId: vi.fn(),
  unloadWebLLMModel: vi.fn(),
}))

const QWEN = 'Qwen2.5-3B-Instruct-q4f16_1-MLC'
const LLAMA = 'Llama-3.2-3B-Instruct-q4f16_1-MLC'

const status = () => useLLMQueryStore.getState().webLLMStatus
const messages = () => useMessageStore.getState().messages

describe('WebLLM load tracking', () => {
  beforeEach(() => {
    vi.mocked(loadWebLLMModel).mockReset().mockResolvedValue(undefined)
    vi.mocked(chatWithWebLLM).mockReset()
    vi.mocked(getWebLLMModelId).mockReset()
    vi.mocked(unloadWebLLMModel).mockReset()
    act(() => {
      useLLMQueryStore.getState().setWebLLMStatus({ state: 'idle' })
      useMessageStore.getState().resetMessages()
    })
  })

  it('moves from loading to ready and says so', async () => {
    let resolve = (): void => {}
    vi.mocked(loadWebLLMModel).mockReturnValue(
      new Promise<void>((r) => {
        resolve = r
      }),
    )

    const done = startWebLLMModelLoad(QWEN)
    expect(status()).toMatchObject({ state: 'loading', modelId: QWEN })
    expect(messages()[0].message).toMatch(/1\.7 GB download the first time/)

    resolve()
    await done
    expect(status()).toEqual({ state: 'ready', modelId: QWEN })
    expect(messages().at(-1)?.message).toMatch(/is ready/)
  })

  it('records progress as WebLLM reports it', async () => {
    let report = (_r: WebLLMLoadProgress): void => {}
    vi.mocked(loadWebLLMModel).mockImplementation((_id, onProgress) => {
      report = onProgress
      return new Promise<void>(() => {})
    })

    void startWebLLMModelLoad(QWEN)
    report({ progress: 0.42, text: 'Fetching param cache[3/40]' })

    expect(status()).toEqual({
      state: 'loading',
      modelId: QWEN,
      progress: 0.42,
      text: 'Fetching param cache[3/40]',
    })
  })

  it('records a failed load with its reason', async () => {
    vi.mocked(loadWebLLMModel).mockRejectedValue(new Error('IntegrityError'))

    await startWebLLMModelLoad(QWEN)

    expect(status()).toEqual({
      state: 'error',
      modelId: QWEN,
      message: 'IntegrityError',
    })
    expect(messages().at(-1)?.severity).toBe(MessageSeverity.ERROR)
  })

  it('does not restart a model that is already loading or loaded', async () => {
    act(() =>
      useLLMQueryStore
        .getState()
        .setWebLLMStatus({ state: 'ready', modelId: QWEN }),
    )
    await startWebLLMModelLoad(QWEN)
    expect(loadWebLLMModel).not.toHaveBeenCalled()
  })

  it('retries a model whose load failed', async () => {
    act(() =>
      useLLMQueryStore
        .getState()
        .setWebLLMStatus({ state: 'error', modelId: QWEN, message: 'x' }),
    )
    await startWebLLMModelLoad(QWEN)
    expect(loadWebLLMModel).toHaveBeenCalledTimes(1)
    expect(status()).toEqual({ state: 'ready', modelId: QWEN })
  })

  it('ignores the outcome of a load that another model replaced', async () => {
    let failFirst = (_e: Error): void => {}
    vi.mocked(loadWebLLMModel)
      .mockReturnValueOnce(
        new Promise<void>((_r, reject) => {
          failFirst = reject
        }),
      )
      .mockResolvedValueOnce(undefined)

    const first = startWebLLMModelLoad(QWEN)
    await startWebLLMModelLoad(LLAMA)
    failFirst(new Error('aborted'))
    await first

    expect(status()).toEqual({ state: 'ready', modelId: LLAMA })
  })

  it('unloads and goes idle when another provider is chosen', () => {
    act(() =>
      useLLMQueryStore
        .getState()
        .setWebLLMStatus({ state: 'ready', modelId: QWEN }),
    )
    stopWebLLM()
    expect(unloadWebLLMModel).toHaveBeenCalled()
    expect(status()).toEqual({ state: 'idle' })
  })

  it('marks the model failed when a query loses the engine', async () => {
    act(() =>
      useLLMQueryStore
        .getState()
        .setWebLLMStatus({ state: 'ready', modelId: QWEN }),
    )
    vi.mocked(chatWithWebLLM).mockRejectedValue(new Error('GPU lost'))
    vi.mocked(getWebLLMModelId).mockReturnValue(undefined)

    await expect(queryWebLLM('hi', QWEN)).rejects.toThrow('GPU lost')
    expect(status()).toEqual({
      state: 'error',
      modelId: QWEN,
      message: 'GPU lost',
    })
  })

  it('keeps the model ready when a query fails but the engine survives', async () => {
    act(() =>
      useLLMQueryStore
        .getState()
        .setWebLLMStatus({ state: 'ready', modelId: QWEN }),
    )
    vi.mocked(chatWithWebLLM).mockRejectedValue(new Error('too long'))
    vi.mocked(getWebLLMModelId).mockReturnValue(QWEN)

    await expect(queryWebLLM('hi', QWEN)).rejects.toThrow('too long')
    expect(status()).toEqual({ state: 'ready', modelId: QWEN })
  })
})

describe('getWebLLMBlocker', () => {
  it('lets a loaded model run', () => {
    expect(
      getWebLLMBlocker({ state: 'ready', modelId: QWEN }, QWEN),
    ).toBeUndefined()
  })

  it('explains each state that blocks a query', () => {
    expect(
      getWebLLMBlocker(
        { state: 'loading', modelId: QWEN, progress: 0.425, text: '' },
        QWEN,
      ),
    ).toBe('Loading Qwen2.5 3B Instruct (42%)...')
    expect(
      getWebLLMBlocker(
        { state: 'error', modelId: QWEN, message: 'IntegrityError' },
        QWEN,
      ),
    ).toMatch(/failed to load \(IntegrityError\)/)
    expect(getWebLLMBlocker({ state: 'idle' }, QWEN)).toMatch(
      /Load an in-browser model/,
    )
  })

  it('blocks when a different model is the one loaded', () => {
    expect(getWebLLMBlocker({ state: 'ready', modelId: LLAMA }, QWEN)).toMatch(
      /Load an in-browser model/,
    )
  })
})
