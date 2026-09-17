import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
    })
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
    expect(screen.getByLabelText('API Key')).toBeTruthy()
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
})
