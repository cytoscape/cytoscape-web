import OpenAI from 'openai'
import { defaultTemplate } from '../model/GPTTemplate'
import testGPTResponse from '../model/gpt-4-0613-response.json'
import { LLMModel } from '../model/LLMModel'

export const analyzeSubsystemGeneSet = async (
  argumentString: string,
  apiKey: string,
  model: LLMModel,
  mock = false,
): Promise<string> => {
  const openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  })

  const message = defaultTemplate(argumentString)

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
    console.log('LLM', e)
    throw e
  }
}
