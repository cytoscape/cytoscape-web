import { describe, expect, it } from 'vitest'

import {
  getPaletteGradientColors,
  PALETTES,
  recommendPaletteCategory,
} from './colorPalettes'

// to run these: npx vitest src/models/VisualStyleModel/impl/colorPalettes.test.ts

describe('getPaletteGradientColors (CW-460)', () => {
  it('returns explicit min/middle/max for a diverging palette', () => {
    const colors = getPaletteGradientColors('rdbu')
    expect(colors).not.toBeNull()
    expect(colors?.min).toBe(PALETTES.rdbu.min)
    expect(colors?.middle).toBe(PALETTES.rdbu.middle)
    expect(colors?.max).toBe(PALETTES.rdbu.max)
  })

  it('derives min/middle/max from a sequential palette color array', () => {
    const seq = PALETTES.Sequential1
    const colors = getPaletteGradientColors('Sequential1')
    expect(colors).not.toBeNull()
    expect(colors?.min).toBe(seq.colors[0])
    expect(colors?.max).toBe(seq.colors[seq.colors.length - 1])
    expect(colors?.middle).toBe(
      seq.colors[Math.floor((seq.colors.length - 1) / 2)],
    )
  })

  it('returns null for an unknown palette', () => {
    expect(getPaletteGradientColors('does-not-exist')).toBeNull()
  })
})

describe('recommendPaletteCategory (CW-460)', () => {
  it('recommends diverging when the data spans zero', () => {
    expect(recommendPaletteCategory(-5, 10)).toBe('diverging')
    expect(recommendPaletteCategory(10, -5)).toBe('diverging')
  })

  it('recommends sequential for single-sided data', () => {
    expect(recommendPaletteCategory(0, 100)).toBe('sequential')
    expect(recommendPaletteCategory(2, 8)).toBe('sequential')
    expect(recommendPaletteCategory(-8, -2)).toBe('sequential')
  })
})
