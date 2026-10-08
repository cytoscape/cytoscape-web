import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { OLLAMA_DEFAULT_BASE_URL } from '../model/LLMProvider'
import { useLLMQueryStore } from './index'

describe('LLMQueryStore', () => {
  beforeEach(() => {
    act(() => {
      const state = useLLMQueryStore.getState()
      state.setLLMProvider('openai')
      state.setLLMBaseUrl('')
      state.setLLMApiKey('')
      state.setLLMCustomApiKey('')
    })
  })

  it('defaults to OpenAI with no base URL', () => {
    const { result } = renderHook(() => useLLMQueryStore())
    expect(result.current.LLMProvider).toBe('openai')
    expect(result.current.LLMBaseUrl).toBe('')
    expect(result.current.LLMModel).toBe('gpt-3.5-turbo')
  })

  it('stores a provider and base URL for a local Ollama endpoint', () => {
    const { result } = renderHook(() => useLLMQueryStore())

    act(() => {
      result.current.setLLMProvider('ollama')
      result.current.setLLMBaseUrl(OLLAMA_DEFAULT_BASE_URL)
      result.current.setLLMModel('llama3.1')
    })

    expect(result.current.LLMProvider).toBe('ollama')
    expect(result.current.LLMBaseUrl).toBe(OLLAMA_DEFAULT_BASE_URL)
    expect(result.current.LLMModel).toBe('llama3.1')
  })

  it('keeps the custom endpoint key separate from the OpenAI key', () => {
    const { result } = renderHook(() => useLLMQueryStore())

    act(() => {
      result.current.setLLMApiKey('sk-openai')
      result.current.setLLMCustomApiKey('custom-key')
    })

    expect(result.current.LLMApiKey).toBe('sk-openai')
    expect(result.current.LLMCustomApiKey).toBe('custom-key')
  })
})
