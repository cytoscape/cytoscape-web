// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { models } from './LLMModel'

describe('LLM models (CW-632)', () => {
  it('offers gpt-4o-mini and gpt-5 as options', () => {
    expect(models).toContain('gpt-4o-mini')
    expect(models).toContain('gpt-5')
  })

  it('keeps gpt-3.5-turbo as the default (first) model', () => {
    // The LLM query store uses models[0] as the default, so appending new
    // options must not change which model is selected by default.
    expect(models[0]).toBe('gpt-3.5-turbo')
  })
})
