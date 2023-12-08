import { defaultTemplate } from './GPTTemplate'
export type LLMTemplateFunction = (input: string) => string

export interface LLMTemplate {
  name: string
  description: string
  rawText: string
  fn: LLMTemplateFunction
}

export const templates: LLMTemplate[] = [
  {
    name: 'Default one-shot',
    description: 'Default one-shot template for gene set analysis',
    fn: defaultTemplate.templateFn,
    rawText: defaultTemplate.rawText,
  },
]
