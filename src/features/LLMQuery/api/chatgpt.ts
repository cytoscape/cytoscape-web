import type { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions'

import { logApi } from '../../../debug'
import testGPTResponse from '../model/gpt-4-0613-response.json'
import { LLMModel } from '../model/LLMModel'
import { getEndpointError, resolveApiKey } from '../model/LLMProvider'

type OpenAIResponseFormat = NonNullable<
  ChatCompletionCreateParamsNonStreaming['response_format']
>

export interface LLMEndpoint {
  apiKey: string
  // '' means the OpenAI default; anything else is an OpenAI-compatible
  // endpoint such as a local Ollama server (http://localhost:11434/v1).
  baseUrl: string
}

export interface LLMRequestOptions extends LLMEndpoint {
  model: LLMModel
}

const createClient = async (endpoint: LLMEndpoint) => {
  // Checked before the client exists so a key can never leave over plain
  // HTTP to a remote host.
  const endpointError = getEndpointError(endpoint.baseUrl, endpoint.apiKey)
  if (endpointError !== undefined) {
    throw new Error(endpointError)
  }
  const { default: OpenAI } = await import('openai')
  const baseUrl = endpoint.baseUrl.trim()
  return new OpenAI({
    apiKey: resolveApiKey(endpoint.apiKey),
    dangerouslyAllowBrowser: true,
    ...(baseUrl === '' ? {} : { baseURL: baseUrl }),
  })
}

export const analyzeSubsystemGeneSet = async (
  message: string,
  options: LLMRequestOptions,
  mock = false,
): Promise<string> => {
  if (mock) {
    return testGPTResponse.choices[0].message.content
  }

  try {
    const openai = await createClient(options)
    const response = await openai.chat.completions.create({
      messages: [{ role: 'user', content: message }],
      model: options.model,
    })

    return response.choices[0].message.content ?? ''
  } catch (e) {
    logApi.error(`[${analyzeSubsystemGeneSet.name}]: LLM error:`, e)
    throw e
  }
}

/** One message of a chat completion request */
export interface LLMChatMessage {
  readonly role: 'system' | 'user' | 'assistant'
  readonly content: string
}

/**
 * How the answer must be shaped: JSON following a schema (structured
 * output), or any JSON object. Endpoints differ in which they accept.
 */
export type LLMResponseFormat =
  | {
      readonly type: 'json_schema'
      readonly json_schema: {
        readonly name: string
        readonly strict: boolean
        readonly schema: Record<string, unknown>
      }
    }
  | { readonly type: 'json_object' }

export interface LLMChatRequest extends LLMRequestOptions {
  readonly messages: readonly LLMChatMessage[]
  readonly responseFormat?: LLMResponseFormat
  readonly signal?: AbortSignal
}

/**
 * Sends a conversation to the configured endpoint and returns the text of
 * the answer ('' when the model returned none). Errors, aborts included,
 * are passed on for the caller to report.
 */
export const requestChatCompletion = async (
  request: LLMChatRequest,
): Promise<string> => {
  const openai = await createClient(request)
  const response = await openai.chat.completions.create(
    {
      model: request.model,
      messages: request.messages.map(({ role, content }) => ({
        role,
        content,
      })),
      ...(request.responseFormat === undefined
        ? {}
        : {
            response_format: {
              ...request.responseFormat,
            } as OpenAIResponseFormat,
          }),
    },
    { signal: request.signal },
  )
  return response.choices[0]?.message.content ?? ''
}

/**
 * Lists the model ids an OpenAI-compatible endpoint reports (for Ollama,
 * the models pulled locally). Sorted for a stable dropdown.
 */
export const listLLMModels = async (
  endpoint: LLMEndpoint,
): Promise<LLMModel[]> => {
  try {
    const openai = await createClient(endpoint)
    const ids: LLMModel[] = []
    for await (const model of openai.models.list()) {
      ids.push(model.id)
    }
    return ids.sort((a, b) => a.localeCompare(b))
  } catch (e) {
    logApi.error(`[${listLLMModels.name}]: failed to list models:`, e)
    throw e
  }
}
