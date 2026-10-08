import { LLMModel, models } from './LLMModel'

export type LLMProviderId = 'openai' | 'ollama' | 'custom'

export interface LLMProvider {
  readonly id: LLMProviderId
  readonly label: string
  // Base URL of the OpenAI-compatible endpoint; '' means the OpenAI default.
  readonly defaultBaseUrl: string
  readonly requiresApiKey: boolean
  // Model names offered as suggestions; any name can still be typed.
  readonly suggestedModels: readonly LLMModel[]
}

// Ollama serves an OpenAI-compatible API under /v1 next to its native API.
export const OLLAMA_DEFAULT_BASE_URL = 'http://localhost:11434/v1'

// The OpenAI SDK refuses to construct a client with an empty key, while
// Ollama and most self-hosted endpoints ignore whatever key is sent.
export const PLACEHOLDER_API_KEY = 'ollama'

// The first entry is the default provider (see the LLM query store).
export const providers: readonly LLMProvider[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    defaultBaseUrl: '',
    requiresApiKey: true,
    suggestedModels: models,
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    defaultBaseUrl: OLLAMA_DEFAULT_BASE_URL,
    requiresApiKey: false,
    suggestedModels: ['llama3.1', 'llama3.2', 'qwen2.5', 'mistral', 'gemma3'],
  },
  {
    id: 'custom',
    label: 'Custom (OpenAI-compatible)',
    defaultBaseUrl: '',
    requiresApiKey: false,
    suggestedModels: [],
  },
]

export const getLLMProvider = (id: LLMProviderId): LLMProvider =>
  providers.find((p) => p.id === id) ?? providers[0]

/**
 * Whether enough is known to send a query: OpenAI needs a key, every
 * other provider needs an endpoint to talk to.
 */
export const isLLMConfigured = (
  providerId: LLMProviderId,
  apiKey: string,
  baseUrl: string,
): boolean => {
  const provider = getLLMProvider(providerId)
  return provider.requiresApiKey ? apiKey.trim() !== '' : baseUrl.trim() !== ''
}

export const resolveApiKey = (apiKey: string): string =>
  apiKey.trim() === '' ? PLACEHOLDER_API_KEY : apiKey.trim()

export interface LLMApiKeys {
  readonly openAiKey: string
  readonly customKey: string
}

/**
 * The key that may be sent to a provider's endpoint. Keys are scoped to the
 * provider they were entered for: the OpenAI key goes to OpenAI only, a custom
 * endpoint gets only its own key, and Ollama is never sent one. A blank key
 * never falls back to another provider's key.
 */
export const selectApiKey = (
  providerId: LLMProviderId,
  keys: LLMApiKeys,
): string => {
  switch (getLLMProvider(providerId).id) {
    case 'openai':
      return keys.openAiKey
    case 'custom':
      return keys.customKey
    case 'ollama':
      return ''
  }
}

const isLoopbackHost = (hostname: string): boolean => {
  const host = hostname.toLowerCase()
  return (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === '[::1]' ||
    /^127(\.\d{1,3}){3}$/.test(host)
  )
}

/**
 * Why an endpoint must not be used, or undefined when it is fine. Plain HTTP
 * is accepted on loopback hosts (a local Ollama) and for keyless requests,
 * where no credential is exposed; a real API key is only ever sent over HTTPS
 * or to loopback.
 */
export const getEndpointError = (
  baseUrl: string,
  apiKey: string,
): string | undefined => {
  const trimmed = baseUrl.trim()
  if (trimmed === '') {
    return undefined
  }
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return 'The endpoint URL is not a valid URL'
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return 'The endpoint URL must start with http:// or https://'
  }
  if (
    url.protocol === 'http:' &&
    !isLoopbackHost(url.hostname) &&
    apiKey.trim() !== ''
  ) {
    return 'An API key is only sent over HTTPS or to localhost. Use an https:// endpoint, or remove the API key.'
  }
  return undefined
}
