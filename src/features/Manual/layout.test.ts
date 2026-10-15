// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { DEFAULT_MANUAL_LAYOUT, resolveManualLayout } from './layout'

describe('resolveManualLayout', () => {
  it('prefers ?layout= over the remembered choice', () => {
    expect(resolveManualLayout('?layout=nested', 'current')).toBe('nested')
  })

  it('falls back to the remembered choice', () => {
    expect(resolveManualLayout('', 'current')).toBe('current')
  })

  it('ignores unknown values and uses the default', () => {
    expect(resolveManualLayout('?layout=wide', 'tabs')).toBe(
      DEFAULT_MANUAL_LAYOUT,
    )
    expect(resolveManualLayout('', null)).toBe(DEFAULT_MANUAL_LAYOUT)
  })
})
