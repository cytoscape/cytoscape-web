import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { listLLMModels } from '../api/chatgpt'
import { OLLAMA_DEFAULT_BASE_URL } from '../model/LLMProvider'
import { useLLMQueryStore } from '../store'
import { LLMQueryOptionsDialog } from './LLMQueryOptionsDialog'

vi.mock('../api/chatgpt', () => ({
  listLLMModels: vi.fn(),
}))

const selectProvider = (id: string): void => {
  const select = screen.getByTestId('llm-query-options-provider-select')
  fireEvent.mouseDown(within(select).getByRole('combobox'))
  fireEvent.click(screen.getByTestId(`llm-query-options-provider-${id}`))
}

describe('LLMQueryOptionsDialog', () => {
  beforeEach(() => {
    act(() => {
      const state = useLLMQueryStore.getState()
      state.setLLMProvider('openai')
      state.setLLMBaseUrl('')
      state.setLLMModel('gpt-3.5-turbo')
      state.setLLMApiKey('')
      state.setLLMCustomApiKey('')
    })
    vi.mocked(listLLMModels).mockReset()
  })

  it('hides the endpoint field for OpenAI', () => {
    render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

    expect(screen.queryByTestId('llm-query-options-base-url-input')).toBeNull()
    expect(screen.getByLabelText('OpenAI API Key')).toBeTruthy()
  })

  it('switching to Ollama pre-fills the local endpoint and a model suggestion', () => {
    render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

    selectProvider('ollama')

    const baseUrl = screen.getByTestId('llm-query-options-base-url-input')
    expect(within(baseUrl).getByRole('textbox')).toHaveProperty(
      'value',
      OLLAMA_DEFAULT_BASE_URL,
    )
    const modelInput = screen.getByTestId('llm-query-options-model-input')
    expect(modelInput).toHaveProperty('value', 'llama3.1')
    // Ollama is never sent a key, so there is nothing to enter
    expect(screen.queryByTestId('llm-query-options-api-key-input')).toBeNull()
  })

  it('accepts a typed model name and saves provider, endpoint and model on confirm', () => {
    const handleClose = vi.fn()
    render(<LLMQueryOptionsDialog open={true} handleClose={handleClose} />)

    selectProvider('ollama')
    const modelInput = screen.getByTestId('llm-query-options-model-input')
    fireEvent.change(modelInput, { target: { value: 'qwen2.5:7b' } })
    fireEvent.click(screen.getByTestId('llm-query-options-confirm-button'))

    const state = useLLMQueryStore.getState()
    expect(state.LLMProvider).toBe('ollama')
    expect(state.LLMBaseUrl).toBe(OLLAMA_DEFAULT_BASE_URL)
    expect(state.LLMModel).toBe('qwen2.5:7b')
    expect(state.LLMApiKey).toBe('')
    expect(handleClose).toHaveBeenCalled()
  })

  it('disables confirm while the model name is blank', () => {
    render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

    fireEvent.change(screen.getByTestId('llm-query-options-model-input'), {
      target: { value: '' },
    })

    expect(
      screen.getByTestId('llm-query-options-confirm-button'),
    ).toHaveProperty('disabled', true)
  })

  it('saves a custom endpoint key separately and never as the OpenAI key', () => {
    act(() => useLLMQueryStore.getState().setLLMApiKey('sk-openai'))
    render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

    selectProvider('custom')
    fireEvent.change(
      within(screen.getByTestId('llm-query-options-base-url-input')).getByRole(
        'textbox',
      ),
      { target: { value: 'https://llm.example.org/v1' } },
    )
    fireEvent.change(screen.getByTestId('llm-query-options-model-input'), {
      target: { value: 'my-model' },
    })
    fireEvent.change(
      within(screen.getByTestId('llm-query-options-api-key-input')).getByRole(
        'textbox',
      ),
      { target: { value: ' custom-key ' } },
    )
    fireEvent.click(screen.getByTestId('llm-query-options-confirm-button'))

    const state = useLLMQueryStore.getState()
    expect(state.LLMCustomApiKey).toBe('custom-key')
    expect(state.LLMApiKey).toBe('sk-openai')
  })

  it('does not send the stored OpenAI key when listing Ollama models', async () => {
    act(() => useLLMQueryStore.getState().setLLMApiKey('sk-openai'))
    vi.mocked(listLLMModels).mockResolvedValue(['llama3.1'])
    render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

    selectProvider('ollama')
    fireEvent.click(
      screen.getByTestId('llm-query-options-refresh-models-button'),
    )

    await waitFor(() => expect(listLLMModels).toHaveBeenCalled())
    expect(listLLMModels).toHaveBeenCalledWith({
      apiKey: '',
      baseUrl: OLLAMA_DEFAULT_BASE_URL,
    })
  })

  it('blocks confirm when a key would travel over plain HTTP to a remote host', () => {
    render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

    selectProvider('custom')
    fireEvent.change(
      within(screen.getByTestId('llm-query-options-base-url-input')).getByRole(
        'textbox',
      ),
      { target: { value: 'http://llm.example.org/v1' } },
    )
    fireEvent.change(screen.getByTestId('llm-query-options-model-input'), {
      target: { value: 'my-model' },
    })
    fireEvent.change(
      within(screen.getByTestId('llm-query-options-api-key-input')).getByRole(
        'textbox',
      ),
      { target: { value: 'custom-key' } },
    )

    expect(
      screen.getByTestId('llm-query-options-confirm-button'),
    ).toHaveProperty('disabled', true)
  })

  it('discards a model listing that resolves after the provider changed', async () => {
    let resolveList: (ids: string[]) => void = () => {}
    vi.mocked(listLLMModels).mockReturnValue(
      new Promise<string[]>((resolve) => {
        resolveList = resolve
      }),
    )
    render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

    selectProvider('ollama')
    fireEvent.click(
      screen.getByTestId('llm-query-options-refresh-models-button'),
    )
    await waitFor(() => expect(listLLMModels).toHaveBeenCalled())

    // The user moves on before the Ollama listing comes back
    selectProvider('openai')
    await act(async () => {
      resolveList(['stale-ollama-model'])
    })

    expect(screen.getByTestId('llm-query-options-model-input')).toHaveProperty(
      'value',
      'gpt-3.5-turbo',
    )
  })

  it('discards unsaved edits on Cancel: reopening shows the stored settings', () => {
    // AnalysisMenu keeps the dialog mounted and only toggles `open`
    const { rerender } = render(
      <LLMQueryOptionsDialog open={true} handleClose={() => {}} />,
    )

    selectProvider('custom')
    fireEvent.change(
      within(screen.getByTestId('llm-query-options-base-url-input')).getByRole(
        'textbox',
      ),
      { target: { value: 'https://llm.example.org/v1' } },
    )
    fireEvent.change(screen.getByTestId('llm-query-options-model-input'), {
      target: { value: 'unsaved-model' },
    })
    fireEvent.change(
      within(screen.getByTestId('llm-query-options-api-key-input')).getByRole(
        'textbox',
      ),
      { target: { value: 'unsaved-key' } },
    )
    fireEvent.click(screen.getByTestId('llm-query-options-preview-button'))

    // Cancel, then reopen
    rerender(<LLMQueryOptionsDialog open={false} handleClose={() => {}} />)
    rerender(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

    expect(screen.queryByTestId('llm-query-options-base-url-input')).toBeNull()
    expect(screen.getByTestId('llm-query-options-model-input')).toHaveProperty(
      'value',
      'gpt-3.5-turbo',
    )
    expect(
      within(screen.getByTestId('llm-query-options-api-key-input')).getByRole(
        'textbox',
      ),
    ).toHaveProperty('value', '')
    expect(screen.getByLabelText('OpenAI API Key')).toBeTruthy()
  })

  it('reopening after Confirm shows the settings that were saved', () => {
    const { rerender } = render(
      <LLMQueryOptionsDialog open={true} handleClose={() => {}} />,
    )

    selectProvider('ollama')
    fireEvent.click(screen.getByTestId('llm-query-options-confirm-button'))
    rerender(<LLMQueryOptionsDialog open={false} handleClose={() => {}} />)
    rerender(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

    expect(
      within(screen.getByTestId('llm-query-options-base-url-input')).getByRole(
        'textbox',
      ),
    ).toHaveProperty('value', OLLAMA_DEFAULT_BASE_URL)
    expect(screen.getByTestId('llm-query-options-model-input')).toHaveProperty(
      'value',
      'llama3.1',
    )
  })
})
