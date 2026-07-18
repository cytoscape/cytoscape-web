import { describe, expect, it } from 'vitest'

import { VisualPropertyValueTypeName } from '../../../models/VisualStyleModel/VisualPropertyValueTypeName'
import { shouldRenderValueAsText } from './VisualPropertyValueForm'

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
