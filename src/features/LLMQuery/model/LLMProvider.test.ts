// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  getEndpointError,
  getLLMProvider,
  isLLMConfigured,
  OLLAMA_DEFAULT_BASE_URL,
  providers,
  resolveApiKey,
  selectApiKey,
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

  it('treats a whitespace-only OpenAI key as missing', () => {
    expect(isLLMConfigured('openai', '   ', '')).toBe(false)
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

describe('selectApiKey', () => {
  const keys = { openAiKey: 'sk-openai', customKey: 'custom-key' }

  it('uses the OpenAI key only for OpenAI', () => {
    expect(selectApiKey('openai', keys)).toBe('sk-openai')
  })

  it('uses the custom key only for the custom endpoint', () => {
    expect(selectApiKey('custom', keys)).toBe('custom-key')
  })

  it('never falls back to the OpenAI key when the custom key is blank', () => {
    expect(selectApiKey('custom', { ...keys, customKey: '' })).toBe('')
  })

  it('always sends no key to Ollama', () => {
    expect(selectApiKey('ollama', keys)).toBe('')
  })
})

describe('getEndpointError', () => {
  it('accepts the OpenAI default (no base URL)', () => {
    expect(getEndpointError('', 'sk-abc')).toBeUndefined()
  })

  it('accepts plain HTTP on loopback hosts, with or without a key', () => {
    expect(getEndpointError(OLLAMA_DEFAULT_BASE_URL, '')).toBeUndefined()
    expect(getEndpointError('http://127.0.0.1:11434/v1', 'k')).toBeUndefined()
    expect(getEndpointError('http://[::1]:11434/v1', 'k')).toBeUndefined()
  })

  it('accepts HTTPS endpoints with a key', () => {
    expect(getEndpointError('https://llm.example.org/v1', 'k')).toBeUndefined()
  })

  it('refuses to send a key over plain HTTP to a non-loopback host', () => {
    expect(getEndpointError('http://llm.example.org/v1', 'k')).toMatch(/https/i)
    // A look-alike host name is not loopback
    expect(getEndpointError('http://localhost.evil.org/v1', 'k')).toBeDefined()
  })

  it('allows keyless plain HTTP on a LAN host, since no credential is exposed', () => {
    expect(getEndpointError('http://192.168.1.20:11434/v1', '')).toBeUndefined()
    expect(
      getEndpointError('http://192.168.1.20:11434/v1', '  '),
    ).toBeUndefined()
  })

  it('rejects malformed URLs and non-HTTP schemes', () => {
    expect(getEndpointError('not a url', '')).toBeDefined()
    expect(getEndpointError('ftp://host/v1', '')).toBeDefined()
  })
})
