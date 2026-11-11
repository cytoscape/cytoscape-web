// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { getModelNameError, MAX_MODEL_NAME_LENGTH, models } from './LLMModel'

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

describe('getModelNameError', () => {
  it('accepts an ordinary model name', () => {
    expect(getModelNameError('gpt-5')).toBeUndefined()
  })

  it.each([
    ['an empty name', ''],
    ['a blank name', '   '],
  ])('rejects %s', (_label, model) => {
    expect(getModelNameError(model)).toBeDefined()
  })

  it('accepts a name at the limit, ignoring surrounding spaces', () => {
    expect(
      getModelNameError(` ${'m'.repeat(MAX_MODEL_NAME_LENGTH)} `),
    ).toBeUndefined()
  })

  it('rejects a longer one, which could not be saved', () => {
    expect(getModelNameError('m'.repeat(MAX_MODEL_NAME_LENGTH + 1))).toMatch(
      /too long/,
    )
  })
})
