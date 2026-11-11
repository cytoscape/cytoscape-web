import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { deleteProfileDb, getProfileSetting } from '../../../data/db/profileDb'
import { logStore } from '../../../debug'
import { models } from '../model/LLMModel'
import { OLLAMA_DEFAULT_BASE_URL } from '../model/LLMProvider'
import { useLLMQueryStore } from './index'
import { loadLLMSessionKeys } from './llmKeySession'
import { saveLLMQueryOptions } from './llmOptionsPersistence'
import {
  LLM_API_KEYS_SESSION_KEY,
  LLM_QUERY_OPTIONS_SETTING,
} from './storageKeys'

/** Back to a fresh page load, without going through the persisting setters. */
const resetStore = (): void => {
  useLLMQueryStore.setState({
    LLMProvider: 'openai',
    LLMBaseUrl: '',
    LLMModel: models[0],
    LLMApiKey: '',
    LLMCustomApiKey: '',
    LLMCustomApiKeyOrigin: '',
    optionsHydrated: false,
  })
}

const storedOptions = async (): Promise<unknown> =>
  await getProfileSetting(LLM_QUERY_OPTIONS_SETTING)

describe('LLMQueryStore', () => {
  beforeEach(async () => {
    window.sessionStorage.clear()
    window.localStorage.clear()
    await deleteProfileDb()
    act(() => {
      resetStore()
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('defaults to OpenAI with no base URL', () => {
    const { result } = renderHook(() => useLLMQueryStore())
    expect(result.current.LLMProvider).toBe('openai')
    expect(result.current.LLMBaseUrl).toBe('')
    expect(result.current.LLMModel).toBe('gpt-6-luna')
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

  describe('options across reloads', () => {
    it('saves provider, endpoint and model in one row', async () => {
      act(() => {
        useLLMQueryStore.getState().setLLMOptions({
          provider: 'ollama',
          baseUrl: OLLAMA_DEFAULT_BASE_URL,
          model: 'llama3.1',
        })
      })

      await vi.waitFor(async () => {
        expect(await storedOptions()).toEqual({
          provider: 'ollama',
          baseUrl: OLLAMA_DEFAULT_BASE_URL,
          model: 'llama3.1',
        })
      })
    })

    it('saves through the single-field setters too', async () => {
      act(() => {
        const state = useLLMQueryStore.getState()
        state.setLLMProvider('custom')
        state.setLLMBaseUrl('https://llm.example.org/v1')
        state.setLLMModel('my-model')
      })

      await vi.waitFor(async () => {
        expect(await storedOptions()).toEqual({
          provider: 'custom',
          baseUrl: 'https://llm.example.org/v1',
          model: 'my-model',
        })
      })
    })

    it('applies the saved options when it hydrates', async () => {
      await saveLLMQueryOptions({
        provider: 'ollama',
        baseUrl: OLLAMA_DEFAULT_BASE_URL,
        model: 'qwen2.5',
      })

      await act(async () => {
        await useLLMQueryStore.getState().hydrateOptions()
      })

      const state = useLLMQueryStore.getState()
      expect(state.LLMProvider).toBe('ollama')
      expect(state.LLMBaseUrl).toBe(OLLAMA_DEFAULT_BASE_URL)
      expect(state.LLMModel).toBe('qwen2.5')
      expect(state.optionsHydrated).toBe(true)
    })

    it('keeps the defaults when nothing was saved', async () => {
      await act(async () => {
        await useLLMQueryStore.getState().hydrateOptions()
      })

      const state = useLLMQueryStore.getState()
      expect(state.LLMProvider).toBe('openai')
      expect(state.LLMBaseUrl).toBe('')
      expect(state.LLMModel).toBe(models[0])
      expect(state.optionsHydrated).toBe(true)
    })

    it('does not let a late read overwrite what the user just chose', async () => {
      await saveLLMQueryOptions({
        provider: 'ollama',
        baseUrl: OLLAMA_DEFAULT_BASE_URL,
        model: 'qwen2.5',
      })

      await act(async () => {
        const hydration = useLLMQueryStore.getState().hydrateOptions()
        useLLMQueryStore.getState().setLLMOptions({
          provider: 'custom',
          baseUrl: 'https://llm.example.org/v1',
          model: 'my-model',
        })
        await hydration
      })

      const state = useLLMQueryStore.getState()
      expect(state.LLMProvider).toBe('custom')
      expect(state.LLMBaseUrl).toBe('https://llm.example.org/v1')
      expect(state.LLMModel).toBe('my-model')
    })

    it('reads the saved options only once', async () => {
      await saveLLMQueryOptions({
        provider: 'ollama',
        baseUrl: OLLAMA_DEFAULT_BASE_URL,
        model: 'qwen2.5',
      })
      await act(async () => {
        await useLLMQueryStore.getState().hydrateOptions()
      })
      await saveLLMQueryOptions({
        provider: 'custom',
        baseUrl: 'https://other.example.org/v1',
        model: 'other',
      })

      await act(async () => {
        await useLLMQueryStore.getState().hydrateOptions()
      })

      expect(useLLMQueryStore.getState().LLMProvider).toBe('ollama')
    })

    it('does not save the prompt template, the query or the result', async () => {
      act(() => {
        const state = useLLMQueryStore.getState()
        state.setGeneQuery('TP53 BRCA1')
        state.setLLMResult('a result')
        state.setLLMOptions({
          provider: 'ollama',
          baseUrl: OLLAMA_DEFAULT_BASE_URL,
          model: 'llama3.1',
        })
      })

      await vi.waitFor(async () => {
        expect(await storedOptions()).toBeDefined()
      })
      expect(Object.keys((await storedOptions()) as object).sort()).toEqual([
        'baseUrl',
        'model',
        'provider',
      ])
    })
  })

  describe('API keys', () => {
    it('keeps a typed key in sessionStorage', () => {
      act(() => {
        useLLMQueryStore.getState().setLLMApiKey('sk-openai')
        useLLMQueryStore.getState().setLLMCustomApiKey('custom-key')
      })

      expect(loadLLMSessionKeys()).toEqual({
        openAiKey: 'sk-openai',
        customKey: 'custom-key',
        customKeyOrigin: '',
      })
    })

    /**
     * The security boundary of #849: a key may sit in this tab's
     * sessionStorage and nowhere else in the browser.
     */
    it('never writes a key to IndexedDB or localStorage', async () => {
      act(() => {
        const state = useLLMQueryStore.getState()
        state.setLLMOptions({
          provider: 'custom',
          baseUrl: 'https://llm.example.org/v1',
          model: 'my-model',
        })
        state.setLLMCustomApiKey('secret-custom')
      })
      expect(useLLMQueryStore.getState().LLMCustomApiKey).toBe('secret-custom')

      await vi.waitFor(async () => {
        expect(await storedOptions()).toBeDefined()
      })
      const row = JSON.stringify(await storedOptions())
      expect(row).not.toContain('secret-custom')
      expect(window.localStorage.length).toBe(0)
      expect(Object.keys(window.sessionStorage)).toEqual([
        LLM_API_KEYS_SESSION_KEY,
      ])
    })

    it('starts with the keys typed earlier in this tab', async () => {
      window.sessionStorage.setItem(
        LLM_API_KEYS_SESSION_KEY,
        JSON.stringify({ openAiKey: 'sk-openai', customKey: 'custom-key' }),
      )
      vi.resetModules()

      const reloaded = await import('./index')

      const state = reloaded.useLLMQueryStore.getState()
      expect(state.LLMApiKey).toBe('sk-openai')
      expect(state.LLMCustomApiKey).toBe('custom-key')
    })

    it('starts with no keys in a new tab', async () => {
      vi.resetModules()

      const reloaded = await import('./index')

      const state = reloaded.useLLMQueryStore.getState()
      expect(state.LLMApiKey).toBe('')
      expect(state.LLMCustomApiKey).toBe('')
    })

    it('forgets the key of one provider and keeps the other', () => {
      act(() => {
        const state = useLLMQueryStore.getState()
        state.setLLMApiKey('sk-openai')
        state.setLLMCustomApiKey('custom-key')
        state.clearLLMApiKey('openai')
      })

      expect(useLLMQueryStore.getState().LLMApiKey).toBe('')
      expect(useLLMQueryStore.getState().LLMCustomApiKey).toBe('custom-key')
      expect(loadLLMSessionKeys()).toEqual({
        openAiKey: '',
        customKey: 'custom-key',
        customKeyOrigin: '',
      })
    })

    it('removes the sessionStorage item with the last key', () => {
      act(() => {
        const state = useLLMQueryStore.getState()
        state.setLLMCustomApiKey('custom-key')
        state.clearLLMApiKey('custom')
      })

      expect(useLLMQueryStore.getState().LLMCustomApiKey).toBe('')
      expect(window.sessionStorage.getItem(LLM_API_KEYS_SESSION_KEY)).toBeNull()
    })

    it('has nothing to forget for Ollama, which is never sent a key', () => {
      act(() => {
        const state = useLLMQueryStore.getState()
        state.setLLMApiKey('sk-openai')
        state.clearLLMApiKey('ollama')
      })

      expect(useLLMQueryStore.getState().LLMApiKey).toBe('sk-openai')
    })
  })

  /**
   * A key is kept only while the provider, and for a custom endpoint the
   * host, it was entered for is the one in use. A key left behind after a
   * switch is exposure the user no longer knows about; a custom key kept
   * across a change of endpoint would be sent to a host it was not entered
   * for.
   */
  describe('keys follow the provider and the endpoint', () => {
    const useCustomEndpoint = (baseUrl: string, key: string): void => {
      const state = useLLMQueryStore.getState()
      state.setLLMOptions({ provider: 'custom', baseUrl, model: 'my-model' })
      state.setLLMCustomApiKey(key)
    }

    it('forgets the OpenAI key when another provider is chosen', () => {
      act(() => {
        const state = useLLMQueryStore.getState()
        state.setLLMApiKey('sk-openai')
        state.setLLMOptions({
          provider: 'ollama',
          baseUrl: OLLAMA_DEFAULT_BASE_URL,
          model: 'llama3.1',
        })
      })

      expect(useLLMQueryStore.getState().LLMApiKey).toBe('')
      expect(window.sessionStorage.getItem(LLM_API_KEYS_SESSION_KEY)).toBeNull()
    })

    it('keeps the OpenAI key when only the model changes', () => {
      act(() => {
        const state = useLLMQueryStore.getState()
        state.setLLMApiKey('sk-openai')
        state.setLLMModel(models[1])
      })

      expect(useLLMQueryStore.getState().LLMApiKey).toBe('sk-openai')
      expect(loadLLMSessionKeys().openAiKey).toBe('sk-openai')
    })

    it('remembers which endpoint a custom key was entered for', () => {
      act(() => useCustomEndpoint('https://llm.example.org/v1', 'custom-key'))

      expect(useLLMQueryStore.getState().LLMCustomApiKeyOrigin).toBe(
        'https://llm.example.org',
      )
      expect(loadLLMSessionKeys()).toEqual({
        openAiKey: '',
        customKey: 'custom-key',
        customKeyOrigin: 'https://llm.example.org',
      })
    })

    it.each([
      ['OpenAI', { provider: 'openai', baseUrl: '', model: models[0] }],
      [
        'Ollama',
        {
          provider: 'ollama',
          baseUrl: OLLAMA_DEFAULT_BASE_URL,
          model: 'llama3.1',
        },
      ],
    ] as const)(
      'forgets the custom key when %s is chosen',
      (_label, options) => {
        act(() => {
          useCustomEndpoint('https://llm.example.org/v1', 'custom-key')
          useLLMQueryStore.getState().setLLMOptions(options)
        })

        const state = useLLMQueryStore.getState()
        expect(state.LLMCustomApiKey).toBe('')
        expect(state.LLMCustomApiKeyOrigin).toBe('')
        expect(
          window.sessionStorage.getItem(LLM_API_KEYS_SESSION_KEY),
        ).toBeNull()
      },
    )

    it.each([
      ['another host', 'https://other.example.org/v1'],
      ['a look-alike host', 'https://llm.example.org.evil.test/v1'],
      ['another port', 'https://llm.example.org:8443/v1'],
      ['plain HTTP on the same host', 'http://llm.example.org/v1'],
    ])('forgets the custom key when the endpoint moves to %s', (_l, next) => {
      act(() => {
        useCustomEndpoint('https://llm.example.org/v1', 'custom-key')
        useLLMQueryStore.getState().setLLMBaseUrl(next)
      })

      expect(useLLMQueryStore.getState().LLMCustomApiKey).toBe('')
      expect(window.sessionStorage.getItem(LLM_API_KEYS_SESSION_KEY)).toBeNull()
    })

    it('keeps the custom key while the endpoint stays on the same host', () => {
      act(() => {
        useCustomEndpoint('https://llm.example.org/v1', 'custom-key')
        const state = useLLMQueryStore.getState()
        state.setLLMBaseUrl('https://llm.example.org/v2')
        state.setLLMModel('another-model')
      })

      expect(useLLMQueryStore.getState().LLMCustomApiKey).toBe('custom-key')
      expect(loadLLMSessionKeys().customKey).toBe('custom-key')
    })

    it('binds a key typed after an endpoint change to the new endpoint', () => {
      act(() => {
        useCustomEndpoint('https://llm.example.org/v1', 'old-key')
        useCustomEndpoint('https://other.example.org/v1', 'new-key')
      })

      expect(loadLLMSessionKeys()).toEqual({
        openAiKey: '',
        customKey: 'new-key',
        customKeyOrigin: 'https://other.example.org',
      })
    })

    /**
     * The saved options are shared by every tab; the keys are per tab. So a
     * reload can find options another tab changed, beside keys this tab
     * still holds.
     */
    describe('when the saved options were changed in another tab', () => {
      const reloadWith = async (keys: {
        LLMApiKey?: string
        LLMCustomApiKey?: string
        LLMCustomApiKeyOrigin?: string
      }): Promise<void> => {
        act(() => {
          useLLMQueryStore.setState({ ...keys, optionsHydrated: false })
        })
        await act(async () => {
          await useLLMQueryStore.getState().hydrateOptions()
        })
      }

      it('forgets the OpenAI key if the provider is no longer OpenAI', async () => {
        window.sessionStorage.setItem(
          LLM_API_KEYS_SESSION_KEY,
          JSON.stringify({ openAiKey: 'sk-openai' }),
        )
        await saveLLMQueryOptions({
          provider: 'ollama',
          baseUrl: OLLAMA_DEFAULT_BASE_URL,
          model: 'llama3.1',
        })

        await reloadWith({ LLMApiKey: 'sk-openai' })

        expect(useLLMQueryStore.getState().LLMApiKey).toBe('')
        expect(
          window.sessionStorage.getItem(LLM_API_KEYS_SESSION_KEY),
        ).toBeNull()
      })

      it('forgets the custom key if the endpoint is now another host', async () => {
        await saveLLMQueryOptions({
          provider: 'custom',
          baseUrl: 'https://other.example.org/v1',
          model: 'my-model',
        })

        await reloadWith({
          LLMCustomApiKey: 'custom-key',
          LLMCustomApiKeyOrigin: 'https://llm.example.org',
        })

        expect(useLLMQueryStore.getState().LLMCustomApiKey).toBe('')
      })

      it('forgets a custom key that says nothing about its endpoint', async () => {
        await saveLLMQueryOptions({
          provider: 'custom',
          baseUrl: 'https://llm.example.org/v1',
          model: 'my-model',
        })

        await reloadWith({
          LLMCustomApiKey: 'custom-key',
          LLMCustomApiKeyOrigin: '',
        })

        expect(useLLMQueryStore.getState().LLMCustomApiKey).toBe('')
      })
    })

    describe('after an ordinary reload', () => {
      it('keeps the OpenAI key', async () => {
        await saveLLMQueryOptions({
          provider: 'openai',
          baseUrl: '',
          model: models[1],
        })
        act(() => {
          useLLMQueryStore.setState({
            LLMApiKey: 'sk-openai',
            optionsHydrated: false,
          })
        })

        await act(async () => {
          await useLLMQueryStore.getState().hydrateOptions()
        })

        expect(useLLMQueryStore.getState().LLMApiKey).toBe('sk-openai')
      })

      it('keeps the custom key for the endpoint it was entered for', async () => {
        await saveLLMQueryOptions({
          provider: 'custom',
          baseUrl: 'https://llm.example.org/v1',
          model: 'my-model',
        })
        act(() => {
          useLLMQueryStore.setState({
            LLMCustomApiKey: 'custom-key',
            LLMCustomApiKeyOrigin: 'https://llm.example.org',
            optionsHydrated: false,
          })
        })

        await act(async () => {
          await useLLMQueryStore.getState().hydrateOptions()
        })

        expect(useLLMQueryStore.getState().LLMCustomApiKey).toBe('custom-key')
      })
    })
  })

  /**
   * Both query callers send the key to `LLMBaseUrl`, whatever the provider.
   * So provider `openai` beside another endpoint would hand the OpenAI key to
   * that endpoint. The saved row never pairs them; the store must not either.
   */
  describe('the OpenAI provider and its endpoint', () => {
    it('drops an endpoint passed with the OpenAI provider', () => {
      act(() => {
        useLLMQueryStore.getState().setLLMOptions({
          provider: 'openai',
          baseUrl: 'https://evil.example/v1',
          model: models[0],
        })
      })

      expect(useLLMQueryStore.getState().LLMBaseUrl).toBe('')
    })

    it('drops the custom endpoint when the provider is set back to OpenAI', () => {
      act(() => {
        const state = useLLMQueryStore.getState()
        state.setLLMOptions({
          provider: 'custom',
          baseUrl: 'https://llm.example.org/v1',
          model: 'my-model',
        })
        state.setLLMApiKey('sk-openai')
        state.setLLMProvider('openai')
      })

      const state = useLLMQueryStore.getState()
      expect(state.LLMProvider).toBe('openai')
      expect(state.LLMBaseUrl).toBe('')
    })

    it('keeps the endpoint of every other provider', () => {
      act(() => {
        useLLMQueryStore.getState().setLLMOptions({
          provider: 'ollama',
          baseUrl: OLLAMA_DEFAULT_BASE_URL,
          model: 'llama3.1',
        })
      })

      expect(useLLMQueryStore.getState().LLMBaseUrl).toBe(
        OLLAMA_DEFAULT_BASE_URL,
      )
    })
  })

  /**
   * What the store holds and what the tab keeps must agree: a key the store
   * accepted but sessionStorage dropped would read as "a key is set" until
   * the next reload, and then be gone.
   */
  describe('a key too long to keep', () => {
    const tooLong = 'k'.repeat(4097)

    it('is not accepted as the OpenAI key', () => {
      vi.spyOn(logStore, 'warn').mockImplementation(() => {})
      act(() => {
        const state = useLLMQueryStore.getState()
        state.setLLMApiKey('sk-openai')
        state.setLLMApiKey(tooLong)
      })

      expect(useLLMQueryStore.getState().LLMApiKey).toBe('sk-openai')
      expect(loadLLMSessionKeys().openAiKey).toBe('sk-openai')
    })

    it('is not accepted as the custom key, and is not logged', () => {
      const warn = vi.spyOn(logStore, 'warn').mockImplementation(() => {})
      act(() => {
        useLLMQueryStore.getState().setLLMCustomApiKey(tooLong)
      })

      expect(useLLMQueryStore.getState().LLMCustomApiKey).toBe('')
      expect(window.sessionStorage.getItem(LLM_API_KEYS_SESSION_KEY)).toBeNull()
      expect(warn).toHaveBeenCalled()
      expect(JSON.stringify(warn.mock.calls)).not.toContain('kkkk')
    })
  })
})
