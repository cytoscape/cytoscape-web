export type LLMModel = string

// The first entry is the default model (see the LLM query store). Only list
// models OpenAI has not scheduled for shutdown
// (https://developers.openai.com/api/docs/deprecations); any other model name
// can still be typed in the LLM Query Options dialog.
export const models: LLMModel[] = ['gpt-6-luna', 'gpt-6.1-sol', 'gpt-5']

// The longest model name the saved options row accepts
// (store/llmOptionsPersistence.ts). Real names are a few dozen characters.
export const MAX_MODEL_NAME_LENGTH = 200

/**
 * Why a model name cannot be used, or undefined when it is fine. The dialog
 * and the saved row share this rule, so anything the dialog confirms can be
 * saved and read back.
 */
export const getModelNameError = (model: LLMModel): string | undefined => {
  const name = model.trim()
  if (name === '') {
    return 'Enter a model name'
  }
  if (name.length > MAX_MODEL_NAME_LENGTH) {
    return `The model name is too long (${MAX_MODEL_NAME_LENGTH} characters at most)`
  }
  return undefined
}
