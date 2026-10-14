// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { isPieChartProperties, isRingChartProperties } from './typeGuards'

const pieProps = { cy_dataColumns: ['a'], cy_colors: [] } as any
const ringProps = {
  cy_dataColumns: ['a'],
  cy_colors: [],
  cy_holeSize: 0.4,
} as any
const noneProps = {} as any

describe('custom graphics type guards', () => {
  it('classifies dataColumns without holeSize as a pie chart', () => {
    expect(isPieChartProperties(pieProps)).toBe(true)
    expect(isRingChartProperties(pieProps)).toBe(false)
  })

  it('classifies dataColumns with holeSize as a ring chart', () => {
    expect(isRingChartProperties(ringProps)).toBe(true)
    expect(isPieChartProperties(ringProps)).toBe(false)
  })

  it('classifies empty properties as neither', () => {
    expect(isPieChartProperties(noneProps)).toBe(false)
    expect(isRingChartProperties(noneProps)).toBe(false)
  })

  it('a holeSize of 0 still counts as a ring chart (key presence, not truthiness)', () => {
    const zeroHole = { ...ringProps, cy_holeSize: 0 }

    expect(isRingChartProperties(zeroHole)).toBe(true)
    expect(isPieChartProperties(zeroHole)).toBe(false)
  })
})
