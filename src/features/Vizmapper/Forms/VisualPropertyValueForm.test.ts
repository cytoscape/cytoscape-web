import { describe, expect, it } from 'vitest'

import { VisualPropertyValueTypeName } from '../../../models/VisualStyleModel/VisualPropertyValueTypeName'
import {
  isOpacityVisualProperty,
  shouldRenderValueAsText,
} from './VisualPropertyValueForm'

// to run these: npx vitest src/features/Vizmapper/Forms/VisualPropertyValueForm.test.ts

describe('shouldRenderValueAsText (CW-436)', () => {
  it('renders string and numeric values as text', () => {
    expect(shouldRenderValueAsText(VisualPropertyValueTypeName.String)).toBe(
      true,
    )
    expect(shouldRenderValueAsText(VisualPropertyValueTypeName.Number)).toBe(
      true,
    )
  })

  it('keeps swatch rendering for color / shape / line types', () => {
    expect(shouldRenderValueAsText(VisualPropertyValueTypeName.Color)).toBe(
      false,
    )
    expect(shouldRenderValueAsText(VisualPropertyValueTypeName.NodeShape)).toBe(
      false,
    )
    expect(shouldRenderValueAsText(VisualPropertyValueTypeName.EdgeLine)).toBe(
      false,
    )
    expect(shouldRenderValueAsText(VisualPropertyValueTypeName.Boolean)).toBe(
      false,
    )
  })
})

describe('isOpacityVisualProperty (CW-591)', () => {
  it('identifies opacity visual properties', () => {
    expect(isOpacityVisualProperty('nodeOpacity')).toBe(true)
    expect(isOpacityVisualProperty('edgeOpacity')).toBe(true)
    expect(isOpacityVisualProperty('nodeBorderOpacity')).toBe(true)
    expect(isOpacityVisualProperty('nodeLabelOpacity')).toBe(true)
    expect(isOpacityVisualProperty('edgeLabelOpacity')).toBe(true)
  })

  it('returns false for non-opacity properties', () => {
    expect(isOpacityVisualProperty('nodeWidth')).toBe(false)
    expect(isOpacityVisualProperty('edgeWidth')).toBe(false)
    expect(isOpacityVisualProperty('nodeLabelFontSize')).toBe(false)
  })
})
