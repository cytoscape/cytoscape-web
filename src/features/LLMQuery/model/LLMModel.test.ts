// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { models } from './LLMModel'

describe('LLM models', () => {
  it('uses gpt-6-luna as the default (first) model (#832)', () => {
    // The LLM query store uses models[0] as the default.
    expect(models[0]).toBe('gpt-6-luna')
  })

  it('suggests current OpenAI models', () => {
    expect(models).toEqual(['gpt-6-luna', 'gpt-6.1-sol', 'gpt-5'])
  })

  it.each(['gpt-3.5-turbo', 'gpt-4-1106-preview', 'gpt-4o-mini', 'gpt-5-nano'])(
    'does not suggest %s, which OpenAI shuts down',
    (retired) => {
      expect(models).not.toContain(retired)
    },
  )
})
