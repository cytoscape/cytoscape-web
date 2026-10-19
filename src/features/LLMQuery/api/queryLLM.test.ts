// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { analyzeSubsystemGeneSet } from './chatgpt'
import { queryLLM } from './queryLLM'
import { queryWebLLM } from './webllmSession'

vi.mock('./chatgpt', () => ({ analyzeSubsystemGeneSet: vi.fn() }))
vi.mock('./webllmSession', () => ({ queryWebLLM: vi.fn() }))

describe('queryLLM', () => {
  beforeEach(() => {
    vi.mocked(analyzeSubsystemGeneSet).mockReset().mockResolvedValue('remote')
    vi.mocked(queryWebLLM).mockReset().mockResolvedValue('local')
  })

  it('runs WebLLM in the browser and never calls an endpoint', async () => {
    await expect(
      queryLLM('prompt', {
        provider: 'webllm',
        apiKey: 'sk-should-not-matter',
        baseUrl: 'https://example.org/v1',
        model: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
      }),
    ).resolves.toBe('local')
    expect(queryWebLLM).toHaveBeenCalledWith(
      'prompt',
      'Qwen2.5-3B-Instruct-q4f16_1-MLC',
    )
    expect(analyzeSubsystemGeneSet).not.toHaveBeenCalled()
  })

  it('sends every other provider to its endpoint without the provider id', async () => {
    await expect(
      queryLLM('prompt', {
        provider: 'ollama',
        apiKey: '',
        baseUrl: 'http://localhost:11434/v1',
        model: 'llama3.1',
      }),
    ).resolves.toBe('remote')
    expect(analyzeSubsystemGeneSet).toHaveBeenCalledWith('prompt', {
      apiKey: '',
      baseUrl: 'http://localhost:11434/v1',
      model: 'llama3.1',
    })
    expect(queryWebLLM).not.toHaveBeenCalled()
  })
})
