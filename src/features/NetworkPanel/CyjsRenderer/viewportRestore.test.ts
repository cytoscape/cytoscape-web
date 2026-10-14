// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { ViewPort } from '../../../models/RendererModel/ViewPort'
import { panForCanvasSize } from './viewportRestore'

const saved = (extra: Partial<ViewPort> = {}): ViewPort => ({
  zoom: 2,
  pan: { x: 100, y: 50 },
  width: 800,
  height: 600,
  ...extra,
})

describe('panForCanvasSize', () => {
  it('returns the saved pan when the canvas size is unchanged', () => {
    expect(panForCanvasSize(saved(), 800, 600)).toEqual({ x: 100, y: 50 })
  })

  it('shifts by half the size change so the center stays put', () => {
    // Canvas lost 200px of width (a side panel grew) and gained 100px of
    // height (the table panel shrank).
    expect(panForCanvasSize(saved(), 600, 700)).toEqual({ x: 0, y: 100 })
  })

  it('keeps the same model point at the canvas center', () => {
    const viewport = saved()
    const width = 537
    const height = 411
    const pan = panForCanvasSize(viewport, width, height)

    const centerBefore = {
      x: (viewport.width! / 2 - viewport.pan.x) / viewport.zoom,
      y: (viewport.height! / 2 - viewport.pan.y) / viewport.zoom,
    }
    const centerAfter = {
      x: (width / 2 - pan.x) / viewport.zoom,
      y: (height / 2 - pan.y) / viewport.zoom,
    }
    expect(centerAfter.x).toBeCloseTo(centerBefore.x)
    expect(centerAfter.y).toBeCloseTo(centerBefore.y)
  })

  it('returns the saved pan when no canvas size was recorded', () => {
    const viewport: ViewPort = { zoom: 1, pan: { x: 10, y: 20 } }

    expect(panForCanvasSize(viewport, 600, 400)).toEqual({ x: 10, y: 20 })
  })

  it('returns the saved pan when only one dimension was recorded', () => {
    expect(panForCanvasSize(saved({ height: undefined }), 600, 400)).toEqual({
      x: 100,
      y: 50,
    })
  })

  it('returns the saved pan when the current canvas is hidden', () => {
    expect(panForCanvasSize(saved(), 0, 0)).toEqual({ x: 100, y: 50 })
  })

  it.each([
    ['zero', 0],
    ['negative', -10],
    ['NaN', Number.NaN],
    ['infinite', Number.POSITIVE_INFINITY],
  ])('ignores a %s recorded size', (_label, size) => {
    expect(panForCanvasSize(saved({ width: size }), 600, 400)).toEqual({
      x: 100,
      y: 50,
    })
  })

  it('returns a copy, not the stored pan object', () => {
    const viewport = saved()

    expect(panForCanvasSize(viewport, 800, 600)).not.toBe(viewport.pan)
  })
})
