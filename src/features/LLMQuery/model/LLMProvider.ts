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
  return provider.requiresApiKey ? apiKey !== '' : baseUrl.trim() !== ''
}

export const resolveApiKey = (apiKey: string): string =>
  apiKey === '' ? PLACEHOLDER_API_KEY : apiKey
