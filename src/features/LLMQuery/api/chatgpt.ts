import OpenAI from 'openai'
import testGPTResponse from '../model/gpt-4-0613-response.json'
import { LLMModel } from '../model/LLMModel'
import { logApi } from '../../../debug'

export const analyzeSubsystemGeneSet = async (
  message: string,
  apiKey: string,
  model: LLMModel,
  mock = false,
): Promise<string> => {
  const openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  })

  if (mock) {
    return testGPTResponse.choices[0].message.content
  }

  try {
    const response = await openai.chat.completions.create({
      messages: [{ role: 'user', content: message }],
      model,
    })

    return response.choices[0].message.content ?? ''
  } catch (e) {
    logApi.error(`[${analyzeSubsystemGeneSet.name}]: LLM error:`, e)
    throw e
  }
}
