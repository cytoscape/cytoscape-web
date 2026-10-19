import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { analyzeSubsystemGeneSet } from '../api/chatgpt'
import { queryWebLLM } from '../api/webllmSession'
import { OLLAMA_DEFAULT_BASE_URL } from '../model/LLMProvider'
import { useLLMQueryStore } from '../store'
import { LLMQueryResultPanel } from './LLMQueryResultPanel'

vi.mock('../api/chatgpt', () => ({
  analyzeSubsystemGeneSet: vi.fn(),
}))

vi.mock('../api/webllmSession', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/webllmSession')>()),
  queryWebLLM: vi.fn(),
}))

describe('LLMQueryResultPanel key scoping', () => {
  beforeEach(() => {
    vi.mocked(analyzeSubsystemGeneSet).mockReset()
    vi.mocked(analyzeSubsystemGeneSet).mockResolvedValue('answer')
    act(() => {
      const state = useLLMQueryStore.getState()
      state.setLLMApiKey('sk-openai')
      state.setLLMCustomApiKey('custom-key')
      state.setGeneQuery('FOXA1, HNF1A')
      state.setLLMModel('llama3.1')
    })
  })

  it('never sends the stored OpenAI key to a local Ollama endpoint', async () => {
    act(() => {
      const state = useLLMQueryStore.getState()
      state.setLLMProvider('ollama')
      state.setLLMBaseUrl(OLLAMA_DEFAULT_BASE_URL)
    })
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
    render(<LLMQueryResultPanel />)

    fireEvent.click(screen.getByTestId('llm-query-regenerate-button'))

    await waitFor(() => expect(analyzeSubsystemGeneSet).toHaveBeenCalled())
    expect(vi.mocked(analyzeSubsystemGeneSet).mock.calls[0][1].apiKey).toBe(
      'custom-key',
    )
  })
})

describe('LLMQueryResultPanel with the in-browser provider', () => {
  const QWEN = 'Qwen2.5-3B-Instruct-q4f16_1-MLC'

  beforeEach(() => {
    vi.mocked(analyzeSubsystemGeneSet).mockReset()
    vi.mocked(queryWebLLM).mockReset().mockResolvedValue('local answer')
    act(() => {
      const state = useLLMQueryStore.getState()
      state.setLLMProvider('webllm')
      state.setLLMBaseUrl('')
      state.setLLMModel(QWEN)
      state.setGeneQuery('FOXA1, HNF1A')
    })
  })

  it('shows load progress and keeps regenerate disabled until the model is ready', () => {
    act(() =>
      useLLMQueryStore.getState().setWebLLMStatus({
        state: 'loading',
        modelId: QWEN,
        progress: 0.25,
        text: 'Fetching param cache[10/40]',
      }),
    )
    render(<LLMQueryResultPanel />)

    const progress = screen.getByTestId('llm-query-webllm-progress')
    expect(progress.textContent).toContain('Loading Qwen2.5 3B Instruct: 25%')
    expect(progress.textContent).toContain('Fetching param cache[10/40]')
    expect(screen.queryByTestId('llm-query-regenerate-button')).toBeNull()
  })

  it('shows why the model failed to load', () => {
    act(() =>
      useLLMQueryStore.getState().setWebLLMStatus({
        state: 'error',
        modelId: QWEN,
        message: 'IntegrityError',
      }),
    )
    render(<LLMQueryResultPanel />)

    expect(screen.getByTestId('llm-query-webllm-error').textContent).toContain(
      'IntegrityError',
    )
  })

  it('queries the loaded model in the browser, never an endpoint', async () => {
    act(() =>
      useLLMQueryStore
        .getState()
        .setWebLLMStatus({ state: 'ready', modelId: QWEN }),
    )
    render(<LLMQueryResultPanel />)

    expect(screen.queryByTestId('llm-query-webllm-progress')).toBeNull()
    fireEvent.click(screen.getByTestId('llm-query-regenerate-button'))

    await waitFor(() => expect(queryWebLLM).toHaveBeenCalled())
    expect(vi.mocked(queryWebLLM).mock.calls[0][1]).toBe(QWEN)
    expect(analyzeSubsystemGeneSet).not.toHaveBeenCalled()
    await screen.findByText('local answer')
  })
})

describe('LLMQueryResultPanel setup states', () => {
  const QWEN = 'Qwen2.5-3B-Instruct-q4f16_1-MLC'
  const geneInput = () =>
    screen.getByTestId('llm-query-gene-input').querySelector('input')!

  beforeEach(() => {
    vi.mocked(analyzeSubsystemGeneSet).mockReset().mockResolvedValue('answer')
    act(() => {
      const state = useLLMQueryStore.getState()
      state.setLLMProvider('openai')
      state.setLLMBaseUrl('')
      state.setLLMApiKey('')
      state.setLLMCustomApiKey('')
      state.setLLMModel('gpt-6-luna')
      state.setGeneQuery('FOXA1, HNF1A')
      state.setWebLLMStatus({ state: 'idle' })
      state.setOptionsDialogOpen(false)
    })
  })

  it('asks for a provider and blocks the query while none is set up', () => {
    render(<LLMQueryResultPanel />)

    expect(screen.getByTestId('llm-query-setup-needed').textContent).toContain(
      'No LLM provider is set up yet',
    )
    expect(geneInput().disabled).toBe(true)
    expect(screen.queryByTestId('llm-query-regenerate-button')).toBeNull()
    expect(
      screen.getByTestId('llm-query-regenerate-button-disabled'),
    ).toHaveProperty('disabled', true)
    // The default model means nothing until a provider is chosen
    expect(screen.queryByText(/Model: /)).toBeNull()
  })

  it('opens the LLM Query Options dialog from Select LLM Provider', () => {
    render(<LLMQueryResultPanel />)

    fireEvent.click(screen.getByTestId('llm-query-select-provider-button'))

    expect(useLLMQueryStore.getState().optionsDialogOpen).toBe(true)
  })

  it('treats an endpoint provider without an endpoint as not set up', () => {
    act(() => useLLMQueryStore.getState().setLLMProvider('ollama'))
    render(<LLMQueryResultPanel />)

    expect(screen.getByTestId('llm-query-setup-needed')).toBeTruthy()
    expect(geneInput().disabled).toBe(true)
  })

  it('shows no notice and enables everything once a provider is set up', () => {
    act(() => useLLMQueryStore.getState().setLLMApiKey('sk-openai'))
    render(<LLMQueryResultPanel />)

    expect(screen.queryByTestId('llm-query-setup-needed')).toBeNull()
    expect(geneInput().disabled).toBe(false)
    expect(screen.getByTestId('llm-query-regenerate-button')).toHaveProperty(
      'disabled',
      false,
    )
    expect(screen.getByText('Model: gpt-6-luna')).toBeTruthy()
  })

  it('keeps Gene Query editable while the in-browser model loads', () => {
    act(() => {
      const state = useLLMQueryStore.getState()
      state.setLLMProvider('webllm')
      state.setLLMModel(QWEN)
      state.setGeneQuery('')
      state.setWebLLMStatus({
        state: 'loading',
        modelId: QWEN,
        progress: 0.5,
        text: '',
      })
    })
    render(<LLMQueryResultPanel />)

    expect(screen.queryByTestId('llm-query-setup-needed')).toBeNull()
    expect(geneInput().disabled).toBe(false)
    fireEvent.change(geneInput(), { target: { value: 'PDX1, MAFA' } })
    expect(geneInput().value).toBe('PDX1, MAFA')
    // A query still has to wait for the model
    expect(screen.queryByTestId('llm-query-regenerate-button')).toBeNull()

    act(() =>
      useLLMQueryStore
        .getState()
        .setWebLLMStatus({ state: 'ready', modelId: QWEN }),
    )
    expect(screen.queryByTestId('llm-query-webllm-progress')).toBeNull()
    expect(geneInput().value).toBe('PDX1, MAFA')
    expect(screen.getByTestId('llm-query-regenerate-button')).toHaveProperty(
      'disabled',
      false,
    )
  })

  it('blocks the query after a failed load and offers to reopen the options', () => {
    act(() => {
      const state = useLLMQueryStore.getState()
      state.setLLMProvider('webllm')
      state.setLLMModel(QWEN)
      state.setWebLLMStatus({
        state: 'error',
        modelId: QWEN,
        message: 'IntegrityError',
      })
    })
    render(<LLMQueryResultPanel />)

    expect(geneInput().disabled).toBe(true)
    expect(screen.queryByTestId('llm-query-regenerate-button')).toBeNull()
    fireEvent.click(screen.getByTestId('llm-query-open-options-button'))
    expect(useLLMQueryStore.getState().optionsDialogOpen).toBe(true)
  })
})
