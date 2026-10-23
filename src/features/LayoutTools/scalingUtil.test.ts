// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  calcScale,
  formatScale,
  getCenter,
  isPointerEvent,
  Position,
  scalePosition,
  SCALING_MARKS,
  snapToMark,
  unscalePosition,
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

describe('scalePosition / unscalePosition', () => {
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
    expect(unscalePosition(position, oddAnchor, [1, 1, 1])).toEqual([
      position[0],
      position[1],
      3,
    ])
  })

  it('round-trips through unscalePosition', () => {
    const position: Position = [123.456, -78.9, 4]
    const factors: [number, number, number] = [0.1, 10, 0.5]
    const [x, y, z] = unscalePosition(
      scalePosition(position, anchor, factors),
      anchor,
      factors,
    )
    expect(x).toBeCloseTo(position[0], 9)
    expect(y).toBeCloseTo(position[1], 9)
    expect(z).toBeCloseTo(4, 9)
  })
})
