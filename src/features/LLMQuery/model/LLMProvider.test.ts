// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  getLLMProvider,
  isLLMConfigured,
  OLLAMA_DEFAULT_BASE_URL,
  providers,
  resolveApiKey,
} from './LLMProvider'

describe('LLM providers', () => {
  it('keeps OpenAI as the default (first) provider', () => {
    expect(providers[0].id).toBe('openai')
    expect(providers[0].requiresApiKey).toBe(true)
    expect(providers[0].defaultBaseUrl).toBe('')
  })

  it('offers a local Ollama provider pointing at its OpenAI-compatible endpoint', () => {
    const ollama = getLLMProvider('ollama')
    expect(ollama.requiresApiKey).toBe(false)
    expect(ollama.defaultBaseUrl).toBe(OLLAMA_DEFAULT_BASE_URL)
    expect(OLLAMA_DEFAULT_BASE_URL).toBe('http://localhost:11434/v1')
  })

  it('falls back to OpenAI for an unknown provider id', () => {
    expect(getLLMProvider('nope' as any).id).toBe('openai')
  })
})

describe('isLLMConfigured', () => {
  it('requires an API key for OpenAI', () => {
    expect(isLLMConfigured('openai', '', '')).toBe(false)
    expect(isLLMConfigured('openai', 'sk-abc', '')).toBe(true)
  })

  it('requires only a base URL for Ollama', () => {
    expect(isLLMConfigured('ollama', '', '')).toBe(false)
    expect(isLLMConfigured('ollama', '', OLLAMA_DEFAULT_BASE_URL)).toBe(true)
  })

  it('requires a base URL for a custom OpenAI-compatible endpoint', () => {
    expect(isLLMConfigured('custom', 'key', '')).toBe(false)
    expect(isLLMConfigured('custom', '', 'http://myhost:8000/v1')).toBe(true)
  })
})

describe('resolveApiKey', () => {
  it('passes the user key through unchanged', () => {
    expect(resolveApiKey('sk-abc')).toBe('sk-abc')
  })

  it('substitutes a placeholder when no key is set, because the SDK rejects an empty key', () => {
    expect(resolveApiKey('')).not.toBe('')
  })
})
