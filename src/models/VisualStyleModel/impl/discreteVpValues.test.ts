import { describe, expect, it } from 'vitest'

import { VisualPropertyValueTypeName } from '../VisualPropertyValueTypeName'
import { getDiscreteVpValues } from './discreteVpValues'

// to run these: npx vitest src/models/VisualStyleModel/impl/discreteVpValues.test.ts

describe('getDiscreteVpValues (CW-569)', () => {
  it('returns edge line type values', () => {
    const values = getDiscreteVpValues(VisualPropertyValueTypeName.EdgeLine)
    expect(values).toContain('solid')
    expect(values).toContain('dotted')
    expect(values).toContain('dashed')
  })

  it('returns node shape values', () => {
    const values = getDiscreteVpValues(VisualPropertyValueTypeName.NodeShape)
    expect(values).toContain('ellipse')
    expect(values.length).toBeGreaterThan(1)
  })

  it('returns an empty array for non-discrete types', () => {
    expect(getDiscreteVpValues(VisualPropertyValueTypeName.Number)).toEqual([])
    expect(getDiscreteVpValues(VisualPropertyValueTypeName.String)).toEqual([])
    expect(getDiscreteVpValues(VisualPropertyValueTypeName.Color)).toEqual([])
  })
})
