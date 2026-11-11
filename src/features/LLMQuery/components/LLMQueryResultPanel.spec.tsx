import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { analyzeSubsystemGeneSet } from '../api/chatgpt'
import { OLLAMA_DEFAULT_BASE_URL } from '../model/LLMProvider'
import { useLLMQueryStore } from '../store'
import { LLMQueryResultPanel } from './LLMQueryResultPanel'

vi.mock('../api/chatgpt', () => ({
  analyzeSubsystemGeneSet: vi.fn(),
}))

describe('LLMQueryResultPanel key scoping', () => {
  beforeEach(() => {
    vi.mocked(analyzeSubsystemGeneSet).mockReset()
    vi.mocked(analyzeSubsystemGeneSet).mockResolvedValue('answer')
    act(() => {
      const state = useLLMQueryStore.getState()
      state.setGeneQuery('FOXA1, HNF1A')
      state.setLLMModel('llama3.1')
    })
  })

  /**
   * The store forgets a key as soon as its provider is not the one in use,
   * so it never holds both. These tests put both there anyway, with a raw
   * `setState`, to show the panel picks the right key on its own account.
   */
  const holdBothKeys = (): void => {
    act(() => {
      useLLMQueryStore.setState({
        LLMApiKey: 'sk-openai',
        LLMCustomApiKey: 'custom-key',
        LLMCustomApiKeyOrigin: 'https://llm.example.org',
      })
    })
  }

  it('never sends the stored OpenAI key to a local Ollama endpoint', async () => {
    act(() => {
      const state = useLLMQueryStore.getState()
      state.setLLMProvider('ollama')
      state.setLLMBaseUrl(OLLAMA_DEFAULT_BASE_URL)
    })
    holdBothKeys()
    render(<LLMQueryResultPanel />)

    fireEvent.click(screen.getByTestId('llm-query-regenerate-button'))

    await waitFor(() => expect(analyzeSubsystemGeneSet).toHaveBeenCalled())
    expect(vi.mocked(analyzeSubsystemGeneSet).mock.calls[0][1]).toEqual({
      apiKey: '',
      baseUrl: OLLAMA_DEFAULT_BASE_URL,
      model: 'llama3.1',
    })
  })

  it('sends a custom endpoint its own key, not the OpenAI key', async () => {
    act(() => {
      const state = useLLMQueryStore.getState()
      state.setLLMProvider('custom')
      state.setLLMBaseUrl('https://llm.example.org/v1')
    })
    holdBothKeys()
    render(<LLMQueryResultPanel />)

    fireEvent.click(screen.getByTestId('llm-query-regenerate-button'))

    await waitFor(() => expect(analyzeSubsystemGeneSet).toHaveBeenCalled())
    expect(vi.mocked(analyzeSubsystemGeneSet).mock.calls[0][1].apiKey).toBe(
      'custom-key',
    )
  })
})
