// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { VisualStyle } from '@/models/VisualStyleModel'
import { getDefaultVisualStyle } from '@/models/VisualStyleModel/impl/defaultVisualStyle'

import { previewBackgroundColor } from './previewBackground'

const withBackground = (color: unknown): VisualStyle => {
  const style = getDefaultVisualStyle()
  return {
    ...style,
    networkBackgroundColor: {
      ...style.networkBackgroundColor,
      defaultValue: color,
    },
  } as VisualStyle
}

describe('previewBackgroundColor', () => {
  it("returns the style's own network background", () => {
    expect(previewBackgroundColor(withBackground('#1a1a2e'))).toBe('#1a1a2e')
  })

  it('falls back to white while the style is still loading', () => {
    expect(previewBackgroundColor(undefined)).toBe('#ffffff')
  })

  it('falls back to white when the style has no background value', () => {
    expect(previewBackgroundColor(withBackground(undefined))).toBe('#ffffff')
    expect(previewBackgroundColor({} as VisualStyle)).toBe('#ffffff')
  })
})
