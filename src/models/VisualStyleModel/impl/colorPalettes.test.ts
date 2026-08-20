// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  getPaletteGradientColors,
  getPalettesByCategory,
  getPaletteSwatchGroups,
  PALETTE_CATEGORY_ORDER,
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

describe('the palette taxonomy', () => {
  it('groups every palette in the table under exactly one category', () => {
    const grouped = PALETTE_CATEGORY_ORDER.flatMap((category) =>
      getPalettesByCategory(category).map(({ id }) => id),
    )

    expect(new Set(grouped).size).toBe(grouped.length)
    expect(grouped.sort()).toEqual(Object.keys(PALETTES).sort())
  })

  it('includes named palettes that id-prefix grouping missed', () => {
    // `key.startsWith('Diverging')` skipped rdbu, brbg, spectral and the rest.
    const diverging = getPalettesByCategory('diverging').map(({ id }) => id)

    expect(diverging).toContain('rdbu')
    expect(diverging).toContain('brbg')
    expect(
      diverging.filter((id) => /^Diverging\d+$/.test(id)).length,
    ).toBeLessThan(diverging.length)
  })

  it('drops only explicitly unsafe palettes under colorBlindSafeOnly', () => {
    const all = getPalettesByCategory('diverging')
    const safe = getPalettesByCategory('diverging', {
      colorBlindSafeOnly: true,
    })
    const unsafe = all.filter(
      ({ palette }) => palette.metadata.colorBlindSafe === false,
    )

    expect(unsafe.length).toBeGreaterThan(0)
    expect(safe).toHaveLength(all.length - unsafe.length)
    expect(
      safe.every(({ palette }) => palette.metadata.colorBlindSafe !== false),
    ).toBe(true)
  })

  it('exposes a category as react-color swatch groups', () => {
    const groups = getPaletteSwatchGroups('viridis')
    const palettes = getPalettesByCategory('viridis')

    expect(groups).toHaveLength(palettes.length)
    expect(groups[0]).toEqual([...palettes[0].palette.colors])
    // A copy, so a picker cannot mutate the table.
    expect(groups[0]).not.toBe(palettes[0].palette.colors)
  })
})
