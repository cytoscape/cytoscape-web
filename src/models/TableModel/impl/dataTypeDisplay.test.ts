import { describe, expect, it } from 'vitest'

import { ValueTypeName } from '../ValueTypeName'
import {
  dataTypeAbbreviation,
  dataTypeChipColor,
  dataTypeDescription,
  dataTypeLabel,
  orderedDataTypes,
} from './dataTypeDisplay'

describe('dataTypeDisplay (CW-562)', () => {
  it('provides a label for every ValueTypeName', () => {
    Object.values(ValueTypeName).forEach((t) => {
      const label = dataTypeLabel(t)
      expect(label).toBeTruthy()
      // Never leak the raw enum wire format to the user
      expect(label).not.toContain('list_of_')
    })
  })

  it('uses the canonical readable list wording', () => {
    expect(dataTypeLabel(ValueTypeName.String)).toBe('String')
    expect(dataTypeLabel(ValueTypeName.Long)).toBe('Long integer')
    expect(dataTypeLabel(ValueTypeName.ListString)).toBe('List of strings')
    expect(dataTypeLabel(ValueTypeName.ListDouble)).toBe(
      'List of floating point numbers',
    )
  })

  it('provides a compact abbreviation for every type', () => {
    Object.values(ValueTypeName).forEach((t) => {
      expect(dataTypeAbbreviation(t)).toBeTruthy()
    })
    expect(dataTypeAbbreviation(ValueTypeName.String)).toBe('str')
    expect(dataTypeAbbreviation(ValueTypeName.ListString)).toBe('[str]')
    expect(dataTypeAbbreviation(ValueTypeName.Double)).toBe('dbl')
    expect(dataTypeAbbreviation(ValueTypeName.ListBoolean)).toBe('[bool]')
  })

  it('provides a description for every type', () => {
    Object.values(ValueTypeName).forEach((t) => {
      expect(dataTypeDescription(t)).toBeTruthy()
    })
    expect(dataTypeDescription(ValueTypeName.String)).toBe('Text (string)')
    expect(dataTypeDescription(ValueTypeName.ListInteger)).toContain(
      'comma-separated',
    )
  })

  it('maps chip colors by type family', () => {
    expect(dataTypeChipColor(ValueTypeName.String)).toBe('default')
    expect(dataTypeChipColor(ValueTypeName.Integer)).toBe('success')
    expect(dataTypeChipColor(ValueTypeName.Long)).toBe('success')
    expect(dataTypeChipColor(ValueTypeName.Double)).toBe('success')
    expect(dataTypeChipColor(ValueTypeName.Boolean)).toBe('secondary')
    expect(dataTypeChipColor(ValueTypeName.ListString)).toBe('primary')
    expect(dataTypeChipColor(ValueTypeName.ListDouble)).toBe('primary')
  })

  it('orderedDataTypes contains every ValueTypeName exactly once', () => {
    const all = Object.values(ValueTypeName)
    expect(orderedDataTypes.length).toBe(all.length)
    expect(new Set(orderedDataTypes).size).toBe(all.length)
    all.forEach((t) => expect(orderedDataTypes).toContain(t))
  })

  it('falls back gracefully for an unknown type', () => {
    const bogus = 'mystery' as ValueTypeName
    expect(dataTypeLabel(bogus)).toBe('mystery')
    expect(dataTypeAbbreviation(bogus)).toBe('mystery')
    expect(dataTypeDescription(bogus)).toBe('Unknown type')
    expect(dataTypeChipColor(bogus)).toBe('default')
  })
})
