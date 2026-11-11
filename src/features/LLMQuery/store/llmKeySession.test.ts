import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { logStore } from '../../../debug'
import {
  clearLLMSessionKeys,
  loadLLMSessionKeys,
  saveLLMSessionKeys,
} from './llmKeySession'
import { LLM_API_KEYS_SESSION_KEY } from './storageKeys'

const NO_KEYS = { openAiKey: '', customKey: '', customKeyOrigin: '' }

beforeEach(() => {
  window.sessionStorage.clear()
  window.localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('LLM API keys in sessionStorage', () => {
  it('has no keys before any were saved', () => {
    expect(loadLLMSessionKeys()).toEqual(NO_KEYS)
  })

  it('reads back the keys it saved, each under its own name', () => {
    saveLLMSessionKeys({
      openAiKey: 'sk-openai',
      customKey: 'custom-key',
      customKeyOrigin: 'https://llm.example.org',
    })

    expect(loadLLMSessionKeys()).toEqual({
      openAiKey: 'sk-openai',
      customKey: 'custom-key',
      customKeyOrigin: 'https://llm.example.org',
    })
  })

  it('writes to sessionStorage and never to localStorage', () => {
    saveLLMSessionKeys({ ...NO_KEYS, openAiKey: 'sk-openai' })

    expect(
      window.sessionStorage.getItem(LLM_API_KEYS_SESSION_KEY),
    ).not.toBeNull()
    expect(window.localStorage.length).toBe(0)
  })

  it('removes the item once both keys are empty', () => {
    saveLLMSessionKeys({ ...NO_KEYS, openAiKey: 'sk-openai' })

    saveLLMSessionKeys(NO_KEYS)

    expect(window.sessionStorage.getItem(LLM_API_KEYS_SESSION_KEY)).toBeNull()
  })

  it('clears the keys', () => {
    saveLLMSessionKeys({
      ...NO_KEYS,
      openAiKey: 'sk-openai',
      customKey: 'custom-key',
    })

    clearLLMSessionKeys()

    expect(window.sessionStorage.getItem(LLM_API_KEYS_SESSION_KEY)).toBeNull()
    expect(loadLLMSessionKeys()).toEqual(NO_KEYS)
  })

  it('trims the keys it reads', () => {
    window.sessionStorage.setItem(
      LLM_API_KEYS_SESSION_KEY,
      JSON.stringify({ openAiKey: '  sk-openai\n', customKey: '' }),
    )

    expect(loadLLMSessionKeys().openAiKey).toBe('sk-openai')
  })

  it.each([
    ['malformed JSON', '{"openAiKey": "sk-'],
    ['a JSON string', '"sk-openai"'],
    ['a JSON array', '["sk-openai", "custom"]'],
    ['JSON null', 'null'],
    ['a JSON number', '7'],
  ])('ignores %s', (_label, raw) => {
    vi.spyOn(logStore, 'warn').mockImplementation(() => {})
    window.sessionStorage.setItem(LLM_API_KEYS_SESSION_KEY, raw)

    expect(loadLLMSessionKeys()).toEqual(NO_KEYS)
  })

  it('drops a field that is not a string and keeps the other', () => {
    window.sessionStorage.setItem(
      LLM_API_KEYS_SESSION_KEY,
      JSON.stringify({ openAiKey: { toString: 'x' }, customKey: 'custom-key' }),
    )

    expect(loadLLMSessionKeys()).toEqual({
      ...NO_KEYS,
      customKey: 'custom-key',
    })
  })

  it('drops an implausibly long value', () => {
    window.sessionStorage.setItem(
      LLM_API_KEYS_SESSION_KEY,
      JSON.stringify({ openAiKey: 'k'.repeat(1025), customKey: 'ok' }),
    )

    expect(loadLLMSessionKeys()).toEqual({ ...NO_KEYS, customKey: 'ok' })
  })

  /**
   * The origin says which endpoint the custom key may be sent to, so a stored
   * value that is not exactly an http(s) origin binds the key to nothing.
   */
  it.each([
    ['a URL with a path', 'https://llm.example.org/v1'],
    ['text that is not a URL', 'anywhere'],
    ['a javascript: URL', 'javascript:alert(1)'],
    ['a value of the wrong type', ['https://llm.example.org']],
  ])('does not accept %s as the origin of the custom key', (_label, origin) => {
    window.sessionStorage.setItem(
      LLM_API_KEYS_SESSION_KEY,
      JSON.stringify({ customKey: 'custom-key', customKeyOrigin: origin }),
    )

    expect(loadLLMSessionKeys().customKeyOrigin).toBe('')
  })

  it('cannot be used to pollute a prototype', () => {
    window.sessionStorage.setItem(
      LLM_API_KEYS_SESSION_KEY,
      '{"__proto__":{"polluted":true},"openAiKey":"sk-openai"}',
    )

    const keys = loadLLMSessionKeys()

    expect(keys).toEqual({ ...NO_KEYS, openAiKey: 'sk-openai' })
    expect(Object.keys(keys)).toEqual([
      'openAiKey',
      'customKey',
      'customKeyOrigin',
    ])
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  /**
   * A JSON syntax error quotes the text it choked on, and that text is the
   * stored keys. The warning must not carry it into the console.
   */
  it('does not put stored text in the log when it cannot parse it', () => {
    const warn = vi.spyOn(logStore, 'warn').mockImplementation(() => {})
    window.sessionStorage.setItem(
      LLM_API_KEYS_SESSION_KEY,
      '{"openAiKey": "sk-secret-value',
    )

    loadLLMSessionKeys()

    expect(warn).toHaveBeenCalled()
    expect(JSON.stringify(warn.mock.calls)).not.toContain('sk-secret')
  })

  it('reads as no keys when sessionStorage is unavailable', () => {
    vi.spyOn(logStore, 'warn').mockImplementation(() => {})
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })

    expect(loadLLMSessionKeys()).toEqual(NO_KEYS)
  })

  it('does not throw when sessionStorage refuses a write', () => {
    const warn = vi.spyOn(logStore, 'warn').mockImplementation(() => {})
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })

    expect(() =>
      saveLLMSessionKeys({ ...NO_KEYS, openAiKey: 'sk-secret-value' }),
    ).not.toThrow()
    expect(warn).toHaveBeenCalled()
    expect(JSON.stringify(warn.mock.calls)).not.toContain('sk-secret')
  })
})
