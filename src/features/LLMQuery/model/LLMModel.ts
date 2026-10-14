export type LLMModel = string

// The first entry is the default model (see the LLM query store). New models are
// appended so the existing default is preserved.
export const models: LLMModel[] = [
  'gpt-3.5-turbo',
  'gpt-4-1106-preview',
  'gpt-4o-mini',
  'gpt-5',
]
