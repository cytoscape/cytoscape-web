import { logApi } from '../../../debug'
import testGPTResponse from '../model/gpt-4-0613-response.json'
import { LLMModel } from '../model/LLMModel'
import { resolveApiKey } from '../model/LLMProvider'

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

  const openai = await createClient(options)
  try {
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

/**
 * Lists the model ids an OpenAI-compatible endpoint reports (for Ollama,
 * the models pulled locally). Sorted for a stable dropdown.
 */
export const listLLMModels = async (
  endpoint: LLMEndpoint,
): Promise<LLMModel[]> => {
  const openai = await createClient(endpoint)
  try {
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
