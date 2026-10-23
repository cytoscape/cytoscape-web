// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { IdType } from '../../models/IdType'
import { NodeView } from '../../models/ViewModel'
import {
  Anchor,
  calcScale,
  formatScale,
  getCenter,
  inferSliderState,
  isPointerEvent,
  Position,
  samePositions,
  scaleFactors,
  scalePosition,
  SCALING_MARKS,
  SLIDER_STEP,
  SliderState,
  sliderValueOfScale,
  snapToMark,
} from './scalingUtil'

describe('calcScale', () => {
  it('maps the ends and the middle of the slider', () => {
    expect(calcScale(-9)).toBeCloseTo(0.1)
    expect(calcScale(0)).toBe(1)
    expect(calcScale(9)).toBe(10)
  })
})

describe('SCALING_MARKS (#879)', () => {
  it('scales by the factor each mark is labelled with', () => {
    for (const { value, label } of SCALING_MARKS) {
      expect(calcScale(value), label).toBeCloseTo(Number(label.slice(1)), 9)
    }
  })

  it('has a mark labelled x0.5 that scales by 0.5', () => {
    const mark = SCALING_MARKS.find(({ label }) => label === 'x0.5')
    expect(mark).toBeDefined()
    expect(calcScale(mark!.value)).toBeCloseTo(0.5, 9)
  })
})

describe('formatScale', () => {
  it('shows whole numbers with one decimal', () => {
    expect(formatScale(1)).toBe('x1.0')
    expect(formatScale(10)).toBe('x10.0')
  })

  it('shows values just off a mark with two decimals', () => {
    expect(formatScale(calcScale(-0.1))).toBe('x0.99')
    expect(formatScale(calcScale(-0.4))).toBe('x0.96')
    expect(formatScale(calcScale(0.1))).toBe('x1.1')
  })

  it('does not print floating-point noise', () => {
    expect(formatScale(calcScale(-7))).toBe('x0.3')
    expect(formatScale(0.1 + 0.2)).toBe('x0.3')
  })
})

describe('snapToMark', () => {
  it('snaps a value next to a mark onto it', () => {
    expect(snapToMark(-0.1)).toBe(0)
    expect(snapToMark(0.3)).toBe(0)
    expect(snapToMark(8.8)).toBe(9)
    expect(snapToMark(-8.7)).toBe(-9)
  })

  it('leaves values away from every mark unchanged', () => {
    expect(snapToMark(0.4)).toBe(0.4)
    expect(snapToMark(2)).toBe(2)
    expect(snapToMark(-6.5)).toBe(-6.5)
  })

  it('snaps onto every mark', () => {
    for (const { value } of SCALING_MARKS) {
      expect(snapToMark(value + 0.2)).toBe(value)
      expect(snapToMark(value - 0.2)).toBe(value)
    }
  })

  it('takes the marks and the distance as arguments', () => {
    expect(snapToMark(1.4, [1, 2], 0.5)).toBe(1)
    expect(snapToMark(1.6, [1, 2], 0.5)).toBe(2)
    expect(snapToMark(1.4, [1, 2], 0.1)).toBe(1.4)
    expect(snapToMark(5, [])).toBe(5)
  })
})

describe('isPointerEvent', () => {
  // The node environment has no DOM event classes: define stand-ins for the
  // duration of the test, as a browser would provide them.
  const withEventClasses = (run: () => void): void => {
    const globals = globalThis as Record<string, unknown>
    const saved = {
      MouseEvent: globals.MouseEvent,
      TouchEvent: globals.TouchEvent,
    }
    class FakeMouseEvent extends Event {}
    class FakeTouchEvent extends Event {}
    globals.MouseEvent = FakeMouseEvent
    globals.TouchEvent = FakeTouchEvent
    try {
      run()
    } finally {
      globals.MouseEvent = saved.MouseEvent
      globals.TouchEvent = saved.TouchEvent
    }
  }

  it('recognizes mouse and touch events, native or wrapped', () => {
    withEventClasses(() => {
      const { MouseEvent: Mouse, TouchEvent: Touch } = globalThis as any
      expect(isPointerEvent(new Mouse('mousedown'))).toBe(true)
      expect(isPointerEvent(new Touch('touchend'))).toBe(true)
      expect(isPointerEvent({ nativeEvent: new Mouse('mouseup') })).toBe(true)
    })
  })

  it('rejects keyboard and input events', () => {
    withEventClasses(() => {
      expect(isPointerEvent(new Event('change'))).toBe(false)
      expect(isPointerEvent({ nativeEvent: new Event('keydown') })).toBe(false)
    })
  })

  it('is false where the browser has no such event classes', () => {
    expect(isPointerEvent(new Event('mousedown'))).toBe(false)
  })
})

describe('getCenter', () => {
  it('returns the center of the bounding box', () => {
    const positions = new Map<string, Position>([
      ['a', [400, 200]],
      ['b', [600, 400]],
      // Inside the box: a centroid would move, the box center does not
      ['c', [410, 210]],
      ['d', [420, 220]],
    ])
    expect(getCenter(positions)).toEqual([500, 300])
  })

  it('returns the position of a single node', () => {
    expect(getCenter(new Map([['a', [-5, 7]]]))).toEqual([-5, 7])
  })

  it('returns the origin for no positions', () => {
    expect(getCenter(new Map())).toEqual([0, 0])
  })
})

describe('scalePosition', () => {
  const anchor: [number, number] = [500, 300]

  it('scales the distance from the anchor', () => {
    expect(scalePosition([600, 400], anchor, [10, 10, 10])).toEqual([
      1500, 1300, 0,
    ])
    expect(scalePosition([400, 200, 2], anchor, [0.5, 2, 3])).toEqual([
      450, 100, 6,
    ])
  })

  it('leaves the anchor itself where it is', () => {
    expect(scalePosition([500, 300], anchor, [0.1, 7, 1])).toEqual([
      500, 300, 0,
    ])
  })

  it('returns the coordinates untouched for a factor of 1', () => {
    const position: Position = [0.1 + 0.2, 1e-9, 3]
    const oddAnchor: [number, number] = [500.1, 299.7]
    expect(scalePosition(position, oddAnchor, [1, 1, 1])).toEqual([
      position[0],
      position[1],
      3,
    ])
  })
})

describe('sliderValueOfScale', () => {
  it('inverts calcScale on every slider step', () => {
    for (let steps = -90; steps <= 90; steps++) {
      // The slider's own values: 3.3, not 3.3000000000000003
      const value = Number((steps * SLIDER_STEP).toFixed(1))
      expect(sliderValueOfScale(calcScale(value))).toBe(value)
    }
  })

  it('returns 0, not -0, for x1.0', () => {
    expect(Object.is(sliderValueOfScale(1), 0)).toBe(true)
    expect(Object.is(sliderValueOfScale(1 - 1e-12), 0)).toBe(true)
  })
})

describe('scaleFactors', () => {
  it('scales only the axes of the mode, and z always', () => {
    expect(scaleFactors('both', 10)).toEqual([10, 10, 10])
    expect(scaleFactors('width', 10)).toEqual([10, 1, 10])
    expect(scaleFactors('height', 10)).toEqual([1, 10, 10])
  })
})

describe('inferSliderState (#896)', () => {
  // Bounding box (400, 200)–(600, 400): centered at (500, 300)
  const originals = new Map<IdType, Position>([
    ['n1', [400, 200]],
    ['n2', [600, 400]],
    ['n3', [450, 350, 5]],
  ])
  const anchor: Anchor = getCenter(originals)
  const BOTH_AT_1: SliderState = { scalingType: 'both', value: 0 }

  /** The node views the slider writes for `state` */
  const scaled = (
    state: SliderState,
    from: Map<IdType, Position> = originals,
    about: Anchor = anchor,
  ): Record<IdType, NodeView> => {
    const factors = scaleFactors(state.scalingType, calcScale(state.value))
    return Object.fromEntries(
      [...from].map(([id, position]) => {
        const [x, y, z] = scalePosition(position, about, factors)
        return [id, { id, x, y, z, values: new Map() } as NodeView]
      }),
    )
  }

  it('keeps the current state when the positions are its own', () => {
    const current: SliderState = { scalingType: 'width', value: 3.3 }
    expect(inferSliderState(scaled(current), originals, anchor, current)).toBe(
      current,
    )
  })

  it('reads the value of a scale in any mode', () => {
    const cases: SliderState[] = [
      { scalingType: 'both', value: 9 },
      { scalingType: 'both', value: -9 },
      { scalingType: 'both', value: 3.3 },
      { scalingType: 'width', value: 9 },
      { scalingType: 'height', value: -0.1 },
    ]
    for (const state of cases) {
      expect(
        inferSliderState(scaled(state), originals, anchor, BOTH_AT_1),
      ).toEqual(state)
    }
  })

  it('reads the original positions as x1.0 in the selected mode', () => {
    const current: SliderState = { scalingType: 'height', value: 9 }
    expect(
      inferSliderState(scaled(BOTH_AT_1), originals, anchor, current),
    ).toEqual({ scalingType: 'height', value: 0 })
  })

  it('does not explain a node moved by hand', () => {
    const views = scaled({ scalingType: 'both', value: 9 })
    views.n3 = { ...views.n3, x: views.n3.x + 1 }
    expect(inferSliderState(views, originals, anchor, BOTH_AT_1)).toBe(
      undefined,
    )
  })

  it('does not explain a node with no original position', () => {
    const views = scaled(BOTH_AT_1)
    views.n4 = { id: 'n4', x: 500, y: 300, values: new Map() } as NodeView
    expect(inferSliderState(views, originals, anchor, BOTH_AT_1)).toBe(
      undefined,
    )
  })

  it('does not explain a scale about another point', () => {
    const views = scaled({ scalingType: 'both', value: 9 }, originals, [0, 0])
    expect(inferSliderState(views, originals, anchor, BOTH_AT_1)).toBe(
      undefined,
    )
  })

  it('does not explain a factor off the slider', () => {
    // x20 is past x10; x2.05 falls between two steps
    for (const factor of [20, 2.05]) {
      const views = Object.fromEntries(
        [...originals].map(([id, position]) => {
          const [x, y, z] = scalePosition(position, anchor, [
            factor,
            factor,
            factor,
          ])
          return [id, { id, x, y, z, values: new Map() } as NodeView]
        }),
      )
      expect(inferSliderState(views, originals, anchor, BOTH_AT_1)).toBe(
        undefined,
      )
    }
  })

  it('does not explain a mirrored layout', () => {
    const views = scaled(BOTH_AT_1)
    for (const id of Object.keys(views)) {
      views[id] = { ...views[id], x: 2 * anchor[0] - views[id].x }
    }
    expect(inferSliderState(views, originals, anchor, BOTH_AT_1)).toBe(
      undefined,
    )
  })

  it('reads a row of nodes on the anchor line from the one axis it spans', () => {
    // Every node at y = 300: the y factor cannot be read, the x factor can
    const row = new Map<IdType, Position>([
      ['a', [0, 300]],
      ['b', [100, 300]],
    ])
    const rowAnchor = getCenter(row)
    const state: SliderState = { scalingType: 'both', value: 9 }
    expect(
      inferSliderState(
        scaled(state, row, rowAnchor),
        row,
        rowAnchor,
        BOTH_AT_1,
      ),
    ).toEqual(state)
  })

  it('reads no nodes as x1.0', () => {
    const current: SliderState = { scalingType: 'width', value: 9 }
    expect(inferSliderState({}, new Map(), [0, 0], current)).toEqual({
      scalingType: 'width',
      value: 0,
    })
  })

  it('checks 20,000 nodes quickly', () => {
    const many = new Map<IdType, Position>()
    for (let i = 0; i < 20000; i++) {
      many.set(`n${i}`, [(i * 7919) % 5000, (i * 104729) % 5000])
    }
    const manyAnchor = getCenter(many)
    const views = scaled({ scalingType: 'both', value: 9 }, many, manyAnchor)

    const start = performance.now()
    const inferred = inferSliderState(views, many, manyAnchor, BOTH_AT_1)
    const elapsed = performance.now() - start

    expect(inferred).toEqual({ scalingType: 'both', value: 9 })
    // About 2.5 ms on a laptop; the limit only catches a gross slowdown
    expect(elapsed).toBeLessThan(250)
  })
})

describe('samePositions', () => {
  const view = (id: IdType, x: number, y: number, z?: number): NodeView =>
    ({ id, x, y, z, values: new Map() }) as NodeView
  const previous: Record<IdType, NodeView> = {
    a: view('a', 1, 2),
    b: view('b', 3, 4, 5),
  }

  it('is true for a new record with the same coordinates', () => {
    expect(
      samePositions(previous, { a: view('a', 1, 2), b: view('b', 3, 4, 5) }),
    ).toBe(true)
  })

  it('treats a missing z as 0', () => {
    expect(
      samePositions(previous, { a: view('a', 1, 2, 0), b: view('b', 3, 4, 5) }),
    ).toBe(true)
  })

  it('is false when a node moved on any axis', () => {
    expect(samePositions(previous, { ...previous, a: view('a', 1.5, 2) })).toBe(
      false,
    )
    expect(samePositions(previous, { ...previous, a: view('a', 1, 3) })).toBe(
      false,
    )
    expect(
      samePositions(previous, { ...previous, b: view('b', 3, 4, 6) }),
    ).toBe(false)
  })

  it('is false when a node was added, removed or replaced', () => {
    expect(samePositions(previous, { ...previous, c: view('c', 0, 0) })).toBe(
      false,
    )
    expect(samePositions(previous, { a: previous.a })).toBe(false)
    expect(
      samePositions(previous, { a: previous.a, c: view('c', 3, 4, 5) }),
    ).toBe(false)
  })
})
