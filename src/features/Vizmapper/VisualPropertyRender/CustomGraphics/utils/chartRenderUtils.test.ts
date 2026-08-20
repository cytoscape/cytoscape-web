// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  calculateChartDimensions,
  calculateRadii,
  calculateSliceAngle,
  degreesToRadians,
} from './chartRenderUtils'
import { CHART_CONSTANTS } from './constants'

describe('calculateChartDimensions', () => {
  it('uses an explicit size for the chart and as the container fallback', () => {
    expect(calculateChartDimensions(100)).toEqual({
      chartSize: 100,
      containerWidth: 100,
      containerHeight: 100,
    })
  })

  it('derives the chart size from the smaller of width and height', () => {
    expect(calculateChartDimensions(undefined, 200, 150)).toEqual({
      chartSize: 150,
      containerWidth: 200,
      containerHeight: 150,
    })
  })

  it('falls back to the default size when nothing is provided', () => {
    expect(calculateChartDimensions()).toEqual({
      chartSize: CHART_CONSTANTS.SIZES.DEFAULT,
      containerWidth: CHART_CONSTANTS.SIZES.DEFAULT,
      containerHeight: CHART_CONSTANTS.SIZES.DEFAULT,
    })
  })
})

describe('calculateRadii', () => {
  it('computes outer radius from chart size minus padding', () => {
    const { outerRadius, viewBoxSize } = calculateRadii(100)

    expect(outerRadius).toBe(50 - CHART_CONSTANTS.PADDING)
    expect(viewBoxSize).toBe(2 * outerRadius)
  })

  it('has no inner radius without a hole size (pie chart)', () => {
    expect(calculateRadii(100).innerRadius).toBeUndefined()
  })

  it('scales the inner radius by the hole size (ring chart)', () => {
    const { outerRadius, innerRadius } = calculateRadii(100, 0.4)

    expect(innerRadius).toBeCloseTo(outerRadius * 0.4)
  })

  it('treats a zero hole size as a zero inner radius, not a pie', () => {
    expect(calculateRadii(100, 0).innerRadius).toBe(0)
  })
})

describe('degreesToRadians', () => {
  it.each([
    [0, 0],
    [90, Math.PI / 2],
    [180, Math.PI],
    [-90, -Math.PI / 2],
  ])('%s° → %s rad', (degrees, radians) => {
    expect(degreesToRadians(degrees)).toBeCloseTo(radians)
  })
})

describe('calculateSliceAngle', () => {
  it('splits the circle evenly across data columns', () => {
    expect(calculateSliceAngle(4)).toBe(90)
    expect(calculateSliceAngle(3)).toBeCloseTo(120)
  })
})
