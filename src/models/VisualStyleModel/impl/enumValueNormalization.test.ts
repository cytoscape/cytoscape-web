import { describe, expect, it } from 'vitest'

import { VisualPropertyValueTypeName } from '../VisualPropertyValueTypeName'
import { normalizeEnumValue } from './enumValueNormalization'

// to run these: npx vitest src/models/VisualStyleModel/impl/enumValueNormalization.test.ts

describe('normalizeEnumValue (CW-517)', () => {
  const { NodeShape, EdgeLine, NodeBorderLine, String: StringType } =
    VisualPropertyValueTypeName

  it('passes canonical node shapes through unchanged', () => {
    expect(normalizeEnumValue(NodeShape, 'diamond')).toBe('diamond')
    expect(normalizeEnumValue(NodeShape, 'round-rectangle')).toBe(
      'round-rectangle',
    )
  })

  it('normalizes case and separators for node shapes', () => {
    expect(normalizeEnumValue(NodeShape, 'Diamond')).toBe('diamond')
    expect(normalizeEnumValue(NodeShape, 'ELLIPSE')).toBe('ellipse')
    expect(normalizeEnumValue(NodeShape, 'Round Rectangle')).toBe(
      'round-rectangle',
    )
    expect(normalizeEnumValue(NodeShape, 'ROUND_RECTANGLE')).toBe(
      'round-rectangle',
    )
  })

  it('normalizes edge line types including Desktop aliases', () => {
    expect(normalizeEnumValue(EdgeLine, 'Dashed')).toBe('dashed')
    expect(normalizeEnumValue(EdgeLine, 'DOTTED')).toBe('dotted')
    expect(normalizeEnumValue(EdgeLine, 'SOLID')).toBe('solid')
    expect(normalizeEnumValue(EdgeLine, 'EQUAL_DASH')).toBe('dashed')
    expect(normalizeEnumValue(EdgeLine, 'DOT')).toBe('dotted')
  })

  it('supports double for node border line only', () => {
    expect(normalizeEnumValue(NodeBorderLine, 'Double')).toBe('double')
  })

  it('leaves unknown values unchanged', () => {
    expect(normalizeEnumValue(EdgeLine, 'zigzag')).toBe('zigzag')
    expect(normalizeEnumValue(NodeShape, 'starburst')).toBe('starburst')
  })

  it('leaves non-enum property types unchanged', () => {
    expect(normalizeEnumValue(StringType, 'Diamond')).toBe('Diamond')
  })
})
