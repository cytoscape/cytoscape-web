// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { getFirstRowTooltipPlacements } from './firstRowTooltipPlacement'

describe('getFirstRowTooltipPlacements (CW-523)', () => {
  it('separates the two tooltips when the first row is flagged', () => {
    const { rowPlacement, matchInfoPlacement } =
      getFirstRowTooltipPlacements(true)

    // The row error tooltip and the "match" info tooltip must not share a
    // placement, otherwise they overlap.
    expect(rowPlacement).toBe('top')
    expect(matchInfoPlacement).toBe('bottom')
    expect(rowPlacement).not.toBe(matchInfoPlacement)
  })

  it('keeps the info tooltip on top when the row has no error tooltip', () => {
    const { rowPlacement, matchInfoPlacement } =
      getFirstRowTooltipPlacements(false)

    // Only the info tooltip is active, so there is nothing to overlap with.
    expect(rowPlacement).toBe('top')
    expect(matchInfoPlacement).toBe('top')
  })
})
