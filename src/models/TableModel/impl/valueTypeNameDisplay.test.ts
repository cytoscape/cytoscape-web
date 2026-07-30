import { describe, expect, it } from 'vitest'

import { ValueTypeName } from '../ValueTypeName'
import {
  valueTypeNameAbbreviation,
  valueTypeNameChipColor,
  valueTypeNameDescription,
  valueTypeNameGlyph,
  valueTypeNameLabel,
  orderedValueTypeNames,
} from './valueTypeNameDisplay'

describe('valueTypeNameDisplay (CW-562)', () => {
  it('provides a label for every ValueTypeName', () => {
    Object.values(ValueTypeName).forEach((t) => {
      const label = valueTypeNameLabel(t)
      expect(label).toBeTruthy()
      // Never leak the raw enum wire format to the user
      expect(label).not.toContain('list_of_')
    })
  })

  it('provides a short sample-value glyph for every ValueTypeName', () => {
    Object.values(ValueTypeName).forEach((t) => {
      const glyph = valueTypeNameGlyph(t)
      expect(glyph).toBeTruthy()
      expect(glyph).not.toContain('list_of_')
      // Header space is the whole point: stay shorter than the abbreviation.
      expect(glyph.length).toBeLessThanOrEqual(5)
    })
  })

  it('brackets list glyphs and samples the value shape', () => {
    expect(valueTypeNameGlyph(ValueTypeName.String)).toBe('ab')
    expect(valueTypeNameGlyph(ValueTypeName.Integer)).toBe('1')
    expect(valueTypeNameGlyph(ValueTypeName.Double)).toBe('1.0')
    expect(valueTypeNameGlyph(ValueTypeName.Boolean)).toBe('y/n')
    expect(valueTypeNameGlyph(ValueTypeName.ListString)).toBe('[ab]')
    expect(valueTypeNameGlyph(ValueTypeName.ListBoolean)).toBe('[y/n]')
  })

  it('uses the canonical readable list wording', () => {
    expect(valueTypeNameLabel(ValueTypeName.String)).toBe('String')
    expect(valueTypeNameLabel(ValueTypeName.Long)).toBe('Long integer')
    expect(valueTypeNameLabel(ValueTypeName.ListString)).toBe('List of strings')
    expect(valueTypeNameLabel(ValueTypeName.ListDouble)).toBe(
      'List of floating point numbers',
    )
  })

  it('provides a compact abbreviation for every type', () => {
    Object.values(ValueTypeName).forEach((t) => {
      expect(valueTypeNameAbbreviation(t)).toBeTruthy()
    })
    expect(valueTypeNameAbbreviation(ValueTypeName.String)).toBe('str')
    expect(valueTypeNameAbbreviation(ValueTypeName.ListString)).toBe('[str]')
    expect(valueTypeNameAbbreviation(ValueTypeName.Double)).toBe('dbl')
    expect(valueTypeNameAbbreviation(ValueTypeName.ListBoolean)).toBe('[bool]')
  })

  it('provides a description for every type', () => {
    Object.values(ValueTypeName).forEach((t) => {
      expect(valueTypeNameDescription(t)).toBeTruthy()
    })
    expect(valueTypeNameDescription(ValueTypeName.String)).toBe('Text (string)')
    expect(valueTypeNameDescription(ValueTypeName.ListInteger)).toContain(
      'comma-separated',
    )
  })

  it('maps chip colors by type family', () => {
    expect(valueTypeNameChipColor(ValueTypeName.String)).toBe('default')
    expect(valueTypeNameChipColor(ValueTypeName.Integer)).toBe('success')
    expect(valueTypeNameChipColor(ValueTypeName.Long)).toBe('success')
    expect(valueTypeNameChipColor(ValueTypeName.Double)).toBe('success')
    expect(valueTypeNameChipColor(ValueTypeName.Boolean)).toBe('secondary')
    expect(valueTypeNameChipColor(ValueTypeName.ListString)).toBe('primary')
    expect(valueTypeNameChipColor(ValueTypeName.ListDouble)).toBe('primary')
  })

  it('orderedValueTypeNames contains every ValueTypeName exactly once', () => {
    const all = Object.values(ValueTypeName)
    expect(orderedValueTypeNames.length).toBe(all.length)
    expect(new Set(orderedValueTypeNames).size).toBe(all.length)
    all.forEach((t) => expect(orderedValueTypeNames).toContain(t))
  })

  it('falls back gracefully for an unknown type', () => {
    const bogus = 'mystery' as ValueTypeName
    expect(valueTypeNameLabel(bogus)).toBe('mystery')
    expect(valueTypeNameAbbreviation(bogus)).toBe('mystery')
    expect(valueTypeNameDescription(bogus)).toBe('Unknown type')
    expect(valueTypeNameChipColor(bogus)).toBe('default')
  })
})
