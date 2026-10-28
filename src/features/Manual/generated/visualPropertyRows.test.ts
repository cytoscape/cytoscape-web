// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { getDefaultVisualStyle } from '@/models/VisualStyleModel/impl/defaultVisualStyle'
import {
  VISUAL_PROPERTY_DESCRIPTIONS,
  visualPropertyRows,
} from './visualPropertyRows'

describe('visualPropertyRows', () => {
  it('describes every visual property the Style panel lists', () => {
    const missing = (['node', 'edge', 'network'] as const)
      .flatMap((group) => visualPropertyRows(group))
      .filter((row) => row.description === undefined)
      .map((row) => row.displayName)
    // A new visual property needs a `tooltip` in defaultVisualStyle.ts or an
    // entry in VISUAL_PROPERTY_DESCRIPTIONS before the manual can list it.
    expect(missing).toEqual([])
  })

  it('has no descriptions for properties that no longer exist', () => {
    const names = new Set(Object.keys(getDefaultVisualStyle()))
    const stale = Object.keys(VISUAL_PROPERTY_DESCRIPTIONS).filter(
      (name) => !names.has(name),
    )
    expect(stale).toEqual([])
  })

  it('covers every property exactly once', () => {
    const rows = (['node', 'edge', 'network'] as const).flatMap((group) =>
      visualPropertyRows(group),
    )
    const covered = rows.flatMap((row) => row.names).sort()
    expect(covered).toEqual(Object.keys(getDefaultVisualStyle()).sort())
  })

  it('collapses the numbered image/chart series into one row each', () => {
    const names = visualPropertyRows('node').map((row) => row.displayName)
    expect(names).toContain('Image/Chart 1–9')
    expect(names).toContain('Image/Chart Position 1–9')
    expect(names).toContain('Image/Chart Size 1–9')
    expect(names).not.toContain('Image/Chart 2')
  })

  it('lists the network background color', () => {
    expect(visualPropertyRows('network')).toEqual([
      expect.objectContaining({ displayName: 'Background Color' }),
    ])
  })
})
