// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { toVerticalPaneSizes } from './splitPaneSizes'

describe('toVerticalPaneSizes', () => {
  it('returns the top and bottom pane heights', () => {
    expect(toVerticalPaneSizes([600, 250])).toEqual([600, 250])
  })

  it('ignores the one-pane emit allotment sends while panes are added', () => {
    // allotment's addView relayouts after each pane, so the first onChange of
    // a (re)mounted split carries a single size. Passing sizes[1] on from it
    // made the Table Browser height NaN.
    expect(toVerticalPaneSizes([850])).toBeUndefined()
  })

  it('ignores an empty emit', () => {
    expect(toVerticalPaneSizes([])).toBeUndefined()
  })

  it('ignores non-finite sizes', () => {
    expect(toVerticalPaneSizes([600, NaN])).toBeUndefined()
    expect(toVerticalPaneSizes([Infinity, 250])).toBeUndefined()
  })

  it('ignores emits with more panes than the vertical split has', () => {
    expect(toVerticalPaneSizes([100, 200, 300])).toBeUndefined()
  })
})
