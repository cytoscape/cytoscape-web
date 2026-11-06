// Dragging a continuous mapping's handles (#901). Each handle's position is
// derived from its control point, and a drag turns the pointer's position
// back into a control point. The number form moves a handle on both axes
// (attribute value and visual property value), its end handles on the y axis
// only; the color and discrete forms move inner handles along x and keep
// their end handles fixed. Every drag must land where the pointer is, even
// when React commits several moves at once.

import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { IdType } from '../../../../../models/IdType'
import {
  NodeVisualPropertyName,
  VisualProperty,
  VisualPropertyName,
  VisualPropertyValueType,
  VisualPropertyValueTypeName,
} from '../../../../../models/VisualStyleModel'
import {
  ContinuousMappingFunction,
  MappingFunctionType,
} from '../../../../../models/VisualStyleModel/VisualMappingFunction'
import { ContinuousFunctionControlPoint } from '../../../../../models/VisualStyleModel/VisualMappingFunction/ContinuousMappingFunction'
import { VisualPropertyGroup } from '../../../../../models/VisualStyleModel/VisualPropertyGroup'
import { ContinuousColorMappingForm } from './ContinuousColorMappingForm'
import { ContinuousDiscreteMappingForm } from './ContinuousDiscreteMappingForm'
import { ContinuousNumberMappingForm } from './ContinuousNumberMappingForm'

const setContinuousMappingValues = vi.fn()

vi.mock('../../../../../data/hooks/stores/VisualStyleStore', () => ({
  useVisualStyleStore: (selector: (state: unknown) => unknown) =>
    selector({ setContinuousMappingValues }),
}))

vi.mock('../../../../../data/hooks/useUndoStack', () => ({
  useUndoStack: () => ({ postEdit: vi.fn() }),
}))

const NETWORK_ID: IdType = 'continuous-handle-drag'

const continuousProperty = (
  name: VisualPropertyName,
  type: VisualPropertyValueTypeName,
  points: Array<[number, VisualPropertyValueType]>,
): VisualProperty<VisualPropertyValueType> => {
  const controlPoints: ContinuousFunctionControlPoint[] = points.map(
    ([value, vpValue]) => ({ value, vpValue }),
  )
  const first = controlPoints[0]
  const last = controlPoints[controlPoints.length - 1]
  const mapping: ContinuousMappingFunction = {
    type: MappingFunctionType.Continuous,
    attribute: 'degree',
    visualPropertyType: type,
    defaultValue: first.vpValue,
    min: first,
    max: last,
    controlPoints,
    ltMinVpValue: first.vpValue,
    gtMaxVpValue: last.vpValue,
  }
  return {
    name,
    group: VisualPropertyGroup.Node,
    type,
    displayName: name,
    defaultValue: first.vpValue,
    mapping,
    bypassMap: new Map(),
  }
}

/**
 * One drag target per handle, in value order: the first `.handle` inside
 * each element a drag moves (the number form's handles have two)
 */
const handlesOf = (container: HTMLElement): HTMLElement[] =>
  Array.from(
    container.querySelectorAll<HTMLElement>('[style*="translate"]'),
  ).map((el) => el.querySelector<HTMLElement>('.handle')!)

/** The element a handle's drag moves, whose transform places the handle */
const moved = (handle: HTMLElement): HTMLElement =>
  handle.closest<HTMLElement>('[style*="translate"]')!

const positionOf = (handle: HTMLElement): { x: number; y: number } => {
  const match = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(
    moved(handle).style.transform,
  )
  expect(match).not.toBeNull()
  return { x: Number(match![1]), y: Number(match![2]) }
}

const press = (target: Element): void => {
  fireEvent.mouseDown(target, { button: 0, clientX: 100, clientY: 100 })
}

/** Moves the pressed pointer by (dx, dy) from where it was pressed */
const moveBy = (dx: number, dy: number): void => {
  document.dispatchEvent(
    new MouseEvent('mousemove', { clientX: 100 + dx, clientY: 100 + dy }),
  )
}

const release = (): void => {
  fireEvent.mouseUp(document)
}

/** Presses on `target`, moves the pointer by (dx, dy) and releases it */
const drag = (target: Element, dx: number, dy: number): void => {
  press(target)
  act(() => moveBy(dx, dy))
  release()
}

/** The control points of the mapping the form last committed */
const committedPoints = (): ContinuousFunctionControlPoint[] => {
  act(() => {
    vi.advanceTimersByTime(250)
  })
  const calls = setContinuousMappingValues.mock.calls
  expect(calls.length).toBeGreaterThan(0)
  return calls[calls.length - 1][4]
}

beforeEach(() => {
  vi.useFakeTimers()
  setContinuousMappingValues.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ContinuousNumberMappingForm handles (#901)', () => {
  // The chart is 600 x 275 with margins of 50 (left, right), 10 (top) and
  // 50 (bottom): values 0–100 span x 50–550, and visual property values
  // 0–100 span y 225–10. The middle handle (50, 50) sits at (300, 117.5).
  const nodeWidth = (): VisualProperty<VisualPropertyValueType> =>
    continuousProperty(
      NodeVisualPropertyName.NodeWidth,
      VisualPropertyValueTypeName.Number,
      [
        [0, 0],
        [50, 50],
        [100, 100],
      ],
    )

  const renderForm = (): HTMLElement[] =>
    handlesOf(
      render(
        <ContinuousNumberMappingForm
          currentNetworkId={NETWORK_ID}
          visualProperty={nodeWidth()}
        />,
      ).container,
    )

  it('moves a handle with the pointer and commits the value under it', () => {
    const [, middle] = renderForm()
    expect(positionOf(middle)).toEqual({ x: 300, y: 117.5 })

    drag(middle, 50, 43)
    expect(positionOf(middle).x).toBeCloseTo(350, 3)
    expect(positionOf(middle).y).toBeCloseTo(160.5, 3)
    // x 350 is value 60; y 160.5 is (225 - 160.5) / 215 of 100
    const [, point] = committedPoints()
    expect(point.value).toBeCloseTo(60, 3)
    expect(point.vpValue).toBeCloseTo(30, 3)
  })

  it('keeps every move when React commits several at once', () => {
    // React 18 commits mouse-move updates in a later task, so in a browser
    // several moves can arrive before one is committed. One act() batches
    // them the same way. react-draggable's <Draggable> added each move to
    // its last committed position, so this drag ended at (305, 122.5) and
    // committed (51, 47.67).
    const [, middle] = renderForm()

    press(middle)
    act(() => {
      moveBy(5, 5)
      moveBy(10, 10)
      moveBy(15, 15)
    })
    release()

    expect(positionOf(middle).x).toBeCloseTo(315, 3)
    expect(positionOf(middle).y).toBeCloseTo(132.5, 3)
    const [, point] = committedPoints()
    expect(point.value).toBeCloseTo(53, 3)
    expect(point.vpValue).toBeCloseTo((92.5 / 215) * 100, 3)
  })

  it('stops a handle at the right edge of the chart', () => {
    const [, middle] = renderForm()

    drag(middle, 5000, 0)
    expect(positionOf(middle).x).toBe(550)
    expect(committedPoints()[1].value).toBe(100)
  })

  it('moves an end handle up and down only', () => {
    const [, , last] = renderForm()
    expect(positionOf(last)).toEqual({ x: 550, y: 10 })

    drag(last, -200, 43)
    expect(positionOf(last).x).toBe(550)
    const points = committedPoints()
    expect(points[2].value).toBe(100)
    expect(points[2].vpValue).toBeCloseTo(80, 3)
  })
})

// The color and discrete forms share one layout: a 560 px gradient for
// values 0–100, with each handle a 2 px line over it. An inner handle stays
// on the gradient (x 0–558); the end handles do not move.
describe.each([
  {
    form: 'ContinuousColorMappingForm',
    Form: ContinuousColorMappingForm,
    property: (): VisualProperty<VisualPropertyValueType> =>
      continuousProperty(
        NodeVisualPropertyName.NodeBackgroundColor,
        VisualPropertyValueTypeName.Color,
        [
          [0, '#000000'],
          [50, '#888888'],
          [100, '#FFFFFF'],
        ],
      ),
  },
  {
    form: 'ContinuousDiscreteMappingForm',
    Form: ContinuousDiscreteMappingForm,
    property: (): VisualProperty<VisualPropertyValueType> =>
      continuousProperty(
        NodeVisualPropertyName.NodeShape,
        VisualPropertyValueTypeName.NodeShape,
        [
          [0, 'ellipse'],
          [50, 'rectangle'],
          [100, 'triangle'],
        ],
      ),
  },
])('$form handles (#901)', ({ Form, property }) => {
  const renderForm = (): HTMLElement[] =>
    handlesOf(
      render(<Form currentNetworkId={NETWORK_ID} visualProperty={property()} />)
        .container,
    )

  it('moves an inner handle along the gradient with the pointer', () => {
    const [, middle] = renderForm()
    expect(positionOf(middle)).toEqual({ x: 280, y: 0 })

    drag(middle, 56, 40)
    expect(positionOf(middle)).toEqual({ x: 336, y: 0 })
    expect(committedPoints()[1].value).toBeCloseTo(60, 3)
  })

  it('keeps every move when React commits several at once', () => {
    // <Draggable> ended this drag at x 290 and committed 51.79
    const [, middle] = renderForm()

    press(middle)
    act(() => {
      moveBy(10, 0)
      moveBy(20, 0)
      moveBy(28, 0)
    })
    release()

    expect(positionOf(middle).x).toBeCloseTo(308, 3)
    expect(committedPoints()[1].value).toBeCloseTo(55, 3)
  })

  it('keeps an inner handle on the gradient', () => {
    const [, middle] = renderForm()

    drag(middle, 5000, 0)
    expect(positionOf(middle).x).toBe(558)
    expect(committedPoints()[1].value).toBeCloseTo((558 / 560) * 100, 3)

    drag(middle, -5000, 0)
    expect(positionOf(middle).x).toBe(0)
    expect(committedPoints()[1].value).toBe(0)
  })

  it('does not move the end handles', () => {
    const [first, , last] = renderForm()
    // Mounting commits the mapping once; only drags count here
    act(() => {
      vi.advanceTimersByTime(250)
    })
    setContinuousMappingValues.mockClear()

    drag(first, 100, 0)
    drag(last, -100, 0)
    expect(positionOf(first).x).toBe(0)
    expect(positionOf(last).x).toBe(560)
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(setContinuousMappingValues).not.toHaveBeenCalled()
  })
})
