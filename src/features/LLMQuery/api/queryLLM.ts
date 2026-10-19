import { LLMProviderId, getLLMProvider } from '../model/LLMProvider'
import { analyzeSubsystemGeneSet, LLMRequestOptions } from './chatgpt'
import { queryWebLLM } from './webllmSession'

export interface LLMQueryRequest extends LLMRequestOptions {
  provider: LLMProviderId
}

/**
 * Sends a prompt to the configured provider: the in-browser WebLLM engine, or
 * an OpenAI-compatible endpoint (OpenAI, Ollama, custom).
 */
export const queryLLM = (
  message: string,
  { provider, ...endpoint }: LLMQueryRequest,
): Promise<string> =>
  getLLMProvider(provider).runsInBrowser
    ? queryWebLLM(message, endpoint.model)
    : analyzeSubsystemGeneSet(message, endpoint)
