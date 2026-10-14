// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { ValueTypeName } from '../ValueTypeName'
import {
  getBadgeWidth,
  getBaseGlyph,
  getValueTypeNameSVG,
} from './valueTypeNameIcons'

describe('valueTypeNameIcons', () => {
  it('draws the sample-value glyph, not the type name', () => {
    const svg = getValueTypeNameSVG(ValueTypeName.String, false)

    expect(svg).toContain('>ab<')
    expect(svg).not.toContain('string')
  })

  it('brackets the glyph for list types', () => {
    const svg = getValueTypeNameSVG(ValueTypeName.ListDouble, false)

    expect(svg).toContain('>[<')
    expect(svg).toContain('>1.0<')
    expect(svg).toContain('>]<')
  })

  it('strips the list prefix before picking a glyph', () => {
    expect(getBaseGlyph(ValueTypeName.ListBoolean)).toBe('y/n')
    expect(getBaseGlyph(ValueTypeName.Boolean)).toBe('y/n')
  })

  it('keeps every badge narrow enough to leave room for the column name', () => {
    Object.values(ValueTypeName).forEach((type) => {
      const width = getBadgeWidth(type)
      expect(width).toBeGreaterThanOrEqual(26)
      expect(width).toBeLessThanOrEqual(50)
    })
  })

  it('gives list badges room for the brackets', () => {
    expect(getBadgeWidth(ValueTypeName.ListString)).toBeGreaterThan(
      getBadgeWidth(ValueTypeName.String),
    )
  })

  it('sizes the svg to the badge width', () => {
    const width = getBadgeWidth(ValueTypeName.Long)
    const svg = getValueTypeNameSVG(ValueTypeName.Long, true)

    expect(svg).toContain(`width="${width}"`)
  })
})
