import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import config from '../../../assets/config.json'
import { logStore } from '../../../debug'
import { LLMModel, models } from '../model/LLMModel'
import { endpointOrigin, LLMProviderId, providers } from '../model/LLMProvider'
import { LLMTemplate, templates } from '../model/LLMTemplate'
import { loadLLMSessionKeys, saveLLMSessionKeys } from './llmKeySession'
import {
  LLMQueryOptions,
  loadLLMQueryOptions,
  saveLLMQueryOptions,
} from './llmOptionsPersistence'

interface LLMQueryState {
  loading: boolean
  geneQuery: string
  LLMResult: string
  // OpenAI key; sent to OpenAI only (see selectApiKey)
  LLMApiKey: string
  // Key for the custom OpenAI-compatible endpoint; sent there only
  LLMCustomApiKey: string
  // Origin of the endpoint that key was entered for (see keysFor)
  LLMCustomApiKeyOrigin: string
  LLMProvider: LLMProviderId
  // OpenAI-compatible endpoint; '' means the OpenAI default
  LLMBaseUrl: string
  LLMModel: LLMModel
  LLMTemplate: LLMTemplate
  // True once provider, endpoint and model are the ones to use: read from
  // the profile database, or set by the user before that read came back.
  optionsHydrated: boolean
}

interface LLMQueryAction {
  setLoading: (loading: boolean) => void
  setGeneQuery: (geneQuery: string) => void
  setLLMResult: (LLMResult: string) => void
  setLLMApiKey: (LLMApiKey: string) => void
  setLLMCustomApiKey: (LLMCustomApiKey: string) => void
  setLLMProvider: (LLMProvider: LLMProviderId) => void
  setLLMBaseUrl: (LLMBaseUrl: string) => void
  setLLMModel: (LLMModel: LLMModel) => void
  setLLMTemplate: (LLMTemplate: LLMTemplate) => void
  // Provider, endpoint and model together: one state change, one saved row
  setLLMOptions: (options: LLMQueryOptions) => void
  // Read the options saved in this browser, once
  hydrateOptions: () => Promise<void>
  // Forget the key entered for a provider, in memory and in sessionStorage
  clearLLMApiKey: (provider: LLMProviderId) => void
}

type LLMQueryStore = LLMQueryState & LLMQueryAction

/**
 * Remember the typed keys for this tab. A key that only came from
 * `config.openAIAPIKey` is not the user's and is not written: it is in the
 * bundle already and seeds the store again on the next load.
 */
const persistKeys = (state: StoredKeys): void => {
  saveLLMSessionKeys({
    openAiKey: state.LLMApiKey === config.openAIAPIKey ? '' : state.LLMApiKey,
    customKey: state.LLMCustomApiKey,
    customKeyOrigin: state.LLMCustomApiKeyOrigin,
  })
}

interface StoredKeys {
  LLMApiKey: string
  LLMCustomApiKey: string
  LLMCustomApiKeyOrigin: string
}

/**
 * The keys that may stay once `provider` and `baseUrl` are the options in
 * use. Everything else is forgotten:
 *
 * - The OpenAI key stays only while the provider is OpenAI.
 * - The custom key stays only while the provider is the custom endpoint AND
 *   that endpoint is still on the origin the key was entered for.
 *
 * Two reasons. A key left behind after a switch is exposure the user no
 * longer knows about: they changed provider and reasonably think the old key
 * is out of the picture, the same way the old endpoint and model are. And a
 * custom key kept across a change of endpoint would be sent, on the next
 * query, to a host it was never entered for.
 *
 * Applied wherever the options change: `setLLMOptions`, and `hydrateOptions`,
 * because the saved options are shared by every tab while the keys are per
 * tab, so a reload can meet options that another tab changed.
 */
const keysFor = (
  provider: LLMProviderId,
  baseUrl: string,
  keys: StoredKeys,
): StoredKeys => {
  const keepCustomKey =
    provider === 'custom' &&
    keys.LLMCustomApiKey !== '' &&
    keys.LLMCustomApiKeyOrigin === endpointOrigin(baseUrl)
  return {
    // Not the user's key any more; a key from the config is what a fresh tab
    // starts with.
    LLMApiKey: provider === 'openai' ? keys.LLMApiKey : config.openAIAPIKey,
    LLMCustomApiKey: keepCustomKey ? keys.LLMCustomApiKey : '',
    LLMCustomApiKeyOrigin: keepCustomKey ? keys.LLMCustomApiKeyOrigin : '',
  }
}

/**
 * Whether the user entered a key for this provider in this tab. A key that
 * only came from `config.openAIAPIKey` is not theirs to forget, and Ollama is
 * never sent one.
 */
export const hasEnteredLLMApiKey = (
  provider: LLMProviderId,
  keys: { LLMApiKey: string; LLMCustomApiKey: string },
): boolean => {
  switch (provider) {
    case 'openai':
      return keys.LLMApiKey !== '' && keys.LLMApiKey !== config.openAIAPIKey
    case 'custom':
      return keys.LLMCustomApiKey !== ''
    case 'ollama':
      return false
  }
}

// The label is written out because `Function.name` is empty under
// minification.
const STORE_LABEL = 'LLMQueryStore'

// sessionStorage is synchronous, so the keys typed earlier in this tab are
// there from the first render (see llmKeySession.ts).
const sessionKeys = loadLLMSessionKeys()

/**
 * Store that holds LLM Query related state/actions.
 *
 * What outlives a reload, and where (#849):
 *
 * - Provider, endpoint and model: the profile database, through
 *   `setLLMOptions`. Every setter of one of the three goes through it, so
 *   "set through a setter" does mean "saved" here.
 * - The API keys: this tab's sessionStorage, and nowhere else. They are never
 *   part of the saved options, and each is forgotten as soon as the provider
 *   or endpoint it was entered for is no longer the one in use (keysFor).
 * - The prompt template, the gene query and the result: nothing. Memory only.
 */
export const useLLMQueryStore = create(
  immer<LLMQueryStore>((set, get) => ({
    loading: false,
    geneQuery: '',
    LLMResult: '',
    LLMApiKey:
      sessionKeys.openAiKey !== ''
        ? sessionKeys.openAiKey
        : config.openAIAPIKey,
    LLMCustomApiKey: sessionKeys.customKey,
    LLMCustomApiKeyOrigin: sessionKeys.customKeyOrigin,
    LLMProvider: providers[0].id,
    LLMBaseUrl: '',
    LLMModel: models[0],
    LLMTemplate: templates[0],
    optionsHydrated: false,
    setLoading: (loading: boolean) => {
      set((state) => {
        state.loading = loading
      })
    },
    setGeneQuery: (geneQuery: string) => {
      set((state) => {
        state.geneQuery = geneQuery
      })
    },
    setLLMResult: (LLMResult: string) => {
      set((state) => {
        state.LLMResult = LLMResult
      })
    },
    setLLMApiKey: (LLMApiKey: string) => {
      set((state) => {
        state.LLMApiKey = LLMApiKey
      })
      persistKeys(get())
    },
    setLLMCustomApiKey: (LLMCustomApiKey: string) => {
      set((state) => {
        state.LLMCustomApiKey = LLMCustomApiKey
        // The key belongs to the endpoint in use when it is entered. Callers
        // that change the endpoint and the key together set the options
        // first, as the dialog does.
        state.LLMCustomApiKeyOrigin =
          LLMCustomApiKey === '' ? '' : endpointOrigin(state.LLMBaseUrl)
      })
      persistKeys(get())
    },
    clearLLMApiKey: (provider) => {
      set((state) => {
        if (provider === 'openai') {
          // Back to what a fresh tab starts with
          state.LLMApiKey = config.openAIAPIKey
        } else if (provider === 'custom') {
          state.LLMCustomApiKey = ''
          state.LLMCustomApiKeyOrigin = ''
        }
        // Ollama is never sent a key, so it has none to forget
      })
      persistKeys(get())
    },
    setLLMProvider: (LLMProvider) => {
      const { LLMBaseUrl, LLMModel, setLLMOptions } = get()
      setLLMOptions({
        provider: LLMProvider,
        baseUrl: LLMBaseUrl,
        model: LLMModel,
      })
    },
    setLLMBaseUrl: (LLMBaseUrl) => {
      const { LLMProvider, LLMModel, setLLMOptions } = get()
      setLLMOptions({
        provider: LLMProvider,
        baseUrl: LLMBaseUrl,
        model: LLMModel,
      })
    },
    setLLMModel: (LLMModel) => {
      const { LLMProvider, LLMBaseUrl, setLLMOptions } = get()
      setLLMOptions({
        provider: LLMProvider,
        baseUrl: LLMBaseUrl,
        model: LLMModel,
      })
    },
    setLLMOptions: (options) => {
      // OpenAI is always the OpenAI endpoint. The query callers send the key
      // to `LLMBaseUrl` whatever the provider, so provider `openai` beside
      // another endpoint would hand the OpenAI key to that endpoint. The
      // saved row has the same rule (parseLLMQueryOptions).
      const baseUrl = options.provider === 'openai' ? '' : options.baseUrl
      set((state) => {
        state.LLMProvider = options.provider
        state.LLMBaseUrl = baseUrl
        state.LLMModel = options.model
        // From here on the user's choice stands: a read of the saved options
        // that is still in flight must not replace it.
        state.optionsHydrated = true
        Object.assign(state, keysFor(options.provider, baseUrl, state))
      })
      persistKeys(get())
      // Outside the recipe: an Immer producer must be pure. Not awaited, and
      // not routed through `scheduleWrite`, whose global suspend switch a
      // workspace reset flips; the profile database is not part of a reset.
      void saveLLMQueryOptions({
        provider: options.provider,
        baseUrl,
        model: options.model,
      }).catch((e) => {
        logStore.error(
          `[${STORE_LABEL}]: Failed to save the LLM Query options: ${e}`,
        )
      })
    },
    hydrateOptions: async () => {
      if (get().optionsHydrated) {
        return
      }
      // Never rejects: an unreadable database or an invalid row is
      // "nothing saved", and the defaults stay.
      const saved = await loadLLMQueryOptions()
      set((state) => {
        if (state.optionsHydrated) {
          // The user chose something, or another caller finished first.
          return
        }
        if (saved !== undefined) {
          state.LLMProvider = saved.provider
          state.LLMBaseUrl = saved.baseUrl
          state.LLMModel = saved.model
        }
        state.optionsHydrated = true
        // Only now are the options known, so only now can the keys this tab
        // came back with be checked against them.
        Object.assign(
          state,
          keysFor(state.LLMProvider, state.LLMBaseUrl, state),
        )
      })
      persistKeys(get())
    },
    setLLMTemplate: (LLMTemplate) => {
      set((state) => {
        state.LLMTemplate = LLMTemplate
      })
    },
  })),
)
