export type LLMModel = string

// The first entry is the default model (see the LLM query store). Only list
// models OpenAI has not scheduled for shutdown
// (https://developers.openai.com/api/docs/deprecations); any other model name
// can still be typed in the LLM Query Options dialog.
export const models: LLMModel[] = ['gpt-6-luna', 'gpt-6.1-sol', 'gpt-5']
