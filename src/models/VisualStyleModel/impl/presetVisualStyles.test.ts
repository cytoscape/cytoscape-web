import { describe, expect, it } from 'vitest'

import { VisualPropertyName } from '../VisualPropertyName'
import { PRESET_VISUAL_STYLES } from './presetVisualStyles'
import { createVisualStyle } from './visualStyleFnImpl'
import { cloneVisualStyle } from './visualStyleSetImpl'

describe('PRESET_VISUAL_STYLES', () => {
  it('ships a non-empty catalogue with unique ids and names', () => {
    expect(PRESET_VISUAL_STYLES.length).toBeGreaterThan(0)
    expect(new Set(PRESET_VISUAL_STYLES.map((p) => p.id)).size).toBe(
      PRESET_VISUAL_STYLES.length,
    )
    expect(new Set(PRESET_VISUAL_STYLES.map((p) => p.name)).size).toBe(
      PRESET_VISUAL_STYLES.length,
    )
  })

  it('gives every preset a name and a description', () => {
    PRESET_VISUAL_STYLES.forEach((preset) => {
      expect(preset.name.trim()).not.toBe('')
      expect(preset.description.trim()).not.toBe('')
    })
  })

  it('carries every visual property a default style has', () => {
    // Built from createVisualStyle(), so a property added to the app later is
    // inherited rather than silently missing from all presets.
    const expected = Object.keys(createVisualStyle()).sort()
    PRESET_VISUAL_STYLES.forEach((preset) => {
      expect(Object.keys(preset.visualStyle).sort()).toEqual(expected)
    })
  })

  it('keeps the passthrough node label mapping', () => {
    // Without it a preview and a real network both render unlabelled nodes.
    PRESET_VISUAL_STYLES.forEach((preset) => {
      expect(
        preset.visualStyle[VisualPropertyName.NodeLabel].mapping,
      ).toBeDefined()
    })
  })

  it('differs visibly from the plain default style', () => {
    // A preset that renders identically to "Default" is a tile that tells the
    // reader nothing.
    const plain = JSON.stringify(
      Object.fromEntries(
        Object.entries(createVisualStyle()).map(([name, vp]) => [
          name,
          (vp as any).defaultValue,
        ]),
      ),
    )
    PRESET_VISUAL_STYLES.forEach((preset) => {
      const asDefaults = JSON.stringify(
        Object.fromEntries(
          Object.entries(preset.visualStyle).map(([name, vp]) => [
            name,
            (vp as any).defaultValue,
          ]),
        ),
      )
      expect(asDefaults).not.toBe(plain)
    })
  })

  it('is pairwise distinct, so no two tiles look the same', () => {
    const fingerprints = PRESET_VISUAL_STYLES.map((preset) =>
      JSON.stringify(
        Object.fromEntries(
          Object.entries(preset.visualStyle).map(([name, vp]) => [
            name,
            (vp as any).defaultValue,
          ]),
        ),
      ),
    )
    expect(new Set(fingerprints).size).toBe(fingerprints.length)
  })

  it('hands out stable object identities', async () => {
    // The thumbnail cache is a WeakMap keyed by the style object. Rebuilding
    // these per access would miss every time and re-rasterize the catalogue on
    // every repaint.
    //
    // Reading one property twice proves nothing — it is the same read. The
    // array has to survive a second module access with its entries intact.
    const again = (await import('./presetVisualStyles')).PRESET_VISUAL_STYLES
    expect(again).toBe(PRESET_VISUAL_STYLES)
    again.forEach((preset, i) => {
      expect(preset).toBe(PRESET_VISUAL_STYLES[i])
      expect(preset.visualStyle).toBe(PRESET_VISUAL_STYLES[i].visualStyle)
    })
  })

  it('survives a consumer cloning and mutating the copy', () => {
    // importStyle deep-clones what it is given; this is the guard that the
    // shared module-scope object cannot be corrupted through a copy.
    const preset = PRESET_VISUAL_STYLES[0]
    const before = preset.visualStyle[VisualPropertyName.NodeBackgroundColor]
      .defaultValue as string

    const copy = cloneVisualStyle(preset.visualStyle)
    copy[VisualPropertyName.NodeBackgroundColor].defaultValue = '#ff00ff'

    expect(
      preset.visualStyle[VisualPropertyName.NodeBackgroundColor].defaultValue,
    ).toBe(before)
  })
})
