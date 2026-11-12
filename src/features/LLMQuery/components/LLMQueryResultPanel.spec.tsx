import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

/**
 * Until the saved options have been read, the store holds the defaults:
 * OpenAI and the default model. A query started then would go to OpenAI even
 * if the saved provider is another one, and it cannot be taken back.
 */
describe('LLMQueryResultPanel before the saved options are read', () => {
  const realHydrate = useLLMQueryStore.getState().hydrateOptions

  beforeEach(() => {
    vi.mocked(analyzeSubsystemGeneSet).mockReset()
    act(() => {
      useLLMQueryStore.setState({
        LLMProvider: 'openai',
        LLMBaseUrl: '',
        LLMApiKey: 'sk-openai',
        optionsHydrated: false,
        // The read never comes back during the test
        hydrateOptions: async () => {},
      })
      useLLMQueryStore.getState().setGeneQuery('FOXA1, HNF1A')
    })
  })

  afterEach(() => {
    act(() => {
      useLLMQueryStore.setState({ hydrateOptions: realHydrate })
    })
  })

  it('does not offer to run a query', () => {
    render(<LLMQueryResultPanel />)

    expect(screen.queryByTestId('llm-query-regenerate-button')).toBeNull()
    expect(
      screen.getByRole('button', { name: 'Regenerate response' }),
    ).toHaveProperty('disabled', true)
  })

  it('offers it once the options are known', () => {
    render(<LLMQueryResultPanel />)

    act(() => useLLMQueryStore.setState({ optionsHydrated: true }))

    expect(screen.getByTestId('llm-query-regenerate-button')).toBeTruthy()
  })
})
