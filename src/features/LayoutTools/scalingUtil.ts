import { IdType } from '../../models/IdType'
import { NodeView } from '../../models/ViewModel'
import type { ScalingType } from './ScalingTypeSelector'

/** A node position: x, y and the optional z. */
export type Position = [number, number, number?]

/** Point the positions are scaled about: [x, y] */
export type Anchor = [number, number]

/** Per-axis scaling factors: [x, y, z] */
export type ScaleFactors = [number, number, number]

/** What the slider shows: the scaling mode and the slider value. */
export interface SliderState {
  scalingType: ScalingType
  value: number
}

/** Lowest and highest slider values */
export const SLIDER_MIN = -9
export const SLIDER_MAX = 9

/** Slider step: the keyboard moves the value by this much */
export const SLIDER_STEP = 0.1

/**
 * Labelled positions on the slider. Each label must be the factor
 * `calcScale` gives at its value: x0.5 sits at -5, not at -4 (x0.6) where it
 * would mirror x5.
 */
export const SCALING_MARKS: { value: number; label: string }[] = [
  {
    value: -9,
    label: 'x0.1',
  },
  {
    value: -5,
    label: 'x0.5',
  },
  {
    value: 0,
    label: 'x1.0',
  },
  {
    value: 4,
    label: 'x5',
  },
  {
    value: 9,
    label: 'x10',
  },
]

/**
 * How close (in slider units) a pointer must land to a mark to snap onto it.
 * One slider step (0.1) is about one pixel, so a click aimed at a mark easily
 * lands a step or two off it: x1.0 would then really be x0.99 or x1.1.
 */
export const MARK_SNAP_DISTANCE = 0.3

/**
 * Compute scaling factor from the slider position
 *
 * @param value value from the slider
 * @returns actual scaling factor
 */
export const calcScale = (value: number): number => {
  let scale = 1.0
  if (value < 0) {
    scale = (10 - Math.abs(value)) / 10
  } else {
    scale = value + 1.0
  }

  return scale
}

/**
 * Inverse of {@link calcScale}: the slider value for a scaling factor,
 * rounded to the slider step.
 */
export const sliderValueOfScale = (scale: number): number => {
  const value = scale >= 1 ? scale - 1 : (scale - 1) * 10
  const steps = Math.round(value / SLIDER_STEP)
  // Divide rather than multiply by the step, so 33 steps is exactly 3.3
  // as the slider has it, not 3.3000000000000003. `+ 0` turns -0 into 0.
  return steps / (1 / SLIDER_STEP) + 0
}

/** Per-axis factors for a scaling factor in the given mode */
export const scaleFactors = (
  scalingType: ScalingType,
  scalingFactor: number,
): ScaleFactors => [
  scalingType === 'height' ? 1.0 : scalingFactor,
  scalingType === 'width' ? 1.0 : scalingFactor,
  scalingFactor,
]

/**
 * Format a scaling factor for the slider's value label: one decimal for whole
 * numbers (x1.0, x10.0), otherwise up to two (x0.99, x1.1), so a value just
 * off a mark never reads as the mark.
 */
export const formatScale = (scale: number): string => {
  const rounded = Math.round(scale * 100) / 100
  return `x${Number.isInteger(rounded) ? rounded.toFixed(1) : rounded}`
}

/**
 * Snap a slider value onto the nearest mark when it lies within `distance` of
 * it. Values farther from every mark are returned unchanged.
 */
export const snapToMark = (
  value: number,
  markValues: number[] = SCALING_MARKS.map((mark) => mark.value),
  distance: number = MARK_SNAP_DISTANCE,
): number => {
  let nearest = value
  let nearestDistance = Infinity
  markValues.forEach((markValue) => {
    const d = Math.abs(markValue - value)
    // The tolerance absorbs float error: |-9 - -8.7| is 0.30000000000000071
    if (d <= distance + 1e-9 && d < nearestDistance) {
      nearest = markValue
      nearestDistance = d
    }
  })
  return nearest
}

/**
 * True when a slider event comes from a mouse, pen or touch, which cannot hit
 * a value as precisely as the keyboard's arrow keys.
 */
export const isPointerEvent = (
  event: Event | { nativeEvent?: Event },
): boolean => {
  const nativeEvent: unknown =
    'nativeEvent' in event && event.nativeEvent !== undefined
      ? event.nativeEvent
      : event
  return (
    (typeof MouseEvent !== 'undefined' && nativeEvent instanceof MouseEvent) ||
    (typeof TouchEvent !== 'undefined' && nativeEvent instanceof TouchEvent)
  )
}

/**
 * Center of the bounding box of the given positions, or [0, 0] when empty.
 * Scaling about this point keeps the network where it is on screen: the
 * bounding box grows or shrinks around its own center.
 */
export const getCenter = (positions: Map<IdType, Position>): Anchor => {
  if (positions.size === 0) {
    return [0, 0]
  }
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  positions.forEach(([x, y]) => {
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  })
  return [(minX + maxX) / 2, (minY + maxY) / 2]
}

/**
 * Scale one coordinate about `anchor`. A factor of 1 returns the coordinate
 * untouched: `anchor + (value - anchor)` is not always exactly `value` in
 * floating point, and x1.0 must restore the original layout exactly.
 */
const scaleCoordinate = (
  value: number,
  anchor: number,
  factor: number,
): number => (factor === 1 ? value : anchor + (value - anchor) * factor)

/**
 * Scale a position about `anchor`. z has no anchor: it is scaled as is.
 */
export const scalePosition = (
  position: Position,
  anchor: Anchor,
  [scaleX, scaleY, scaleZ]: ScaleFactors,
): [number, number, number] => [
  scaleCoordinate(position[0], anchor[0], scaleX),
  scaleCoordinate(position[1], anchor[1], scaleY),
  (position[2] ?? 0) * scaleZ,
]

/**
 * A node closer to the anchor than this on an axis, in coordinate units, is
 * not used to read that axis' factor: dividing by a tiny distance would
 * magnify rounding error.
 */
const MIN_SPAN = 1

/** True when `actual` is `expected` up to floating-point error. */
const near = (actual: number, expected: number): boolean =>
  Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected))

/**
 * True when every node in `nodeIds` stands where the slider in `state`
 * would put it: its original position scaled about `anchor`.
 */
const matches = (
  nodeIds: IdType[],
  nodeViews: Record<IdType, NodeView>,
  originals: Map<IdType, Position>,
  anchor: Anchor,
  { scalingType, value }: SliderState,
): boolean => {
  const [scaleX, scaleY, scaleZ] = scaleFactors(scalingType, calcScale(value))
  // The same arithmetic as scalePosition, without an array per node: this
  // loop runs over every node of the network
  for (const nodeId of nodeIds) {
    const nv = nodeViews[nodeId]
    const original = originals.get(nodeId)
    if (
      original === undefined ||
      !near(nv.x, scaleCoordinate(original[0], anchor[0], scaleX)) ||
      !near(nv.y, scaleCoordinate(original[1], anchor[1], scaleY)) ||
      !near(nv.z ?? 0, (original[2] ?? 0) * scaleZ)
    ) {
      return false
    }
  }
  return true
}

/**
 * True when `next` holds the same nodes as `previous`, each at the same
 * x, y and z. The store replaces `nodeViews` for writes that move nothing
 * (e.g. `updateNodePositions` with the current coordinates); those must not
 * make the slider reread the layout and undo a mode the user just picked.
 */
export const samePositions = (
  previous: Record<IdType, NodeView>,
  next: Record<IdType, NodeView>,
): boolean => {
  if (previous === next) {
    return true
  }
  const nodeIds: IdType[] = Object.keys(next)
  if (nodeIds.length !== Object.keys(previous).length) {
    return false
  }
  for (const nodeId of nodeIds) {
    const before = previous[nodeId]
    const after = next[nodeId]
    if (
      before === undefined ||
      before.x !== after.x ||
      before.y !== after.y ||
      (before.z ?? 0) !== (after.z ?? 0)
    ) {
      return false
    }
  }
  return true
}

/**
 * The slider state that explains the current node positions, or undefined
 * when none does and the slider must start over from what is on screen.
 *
 * The positions are explained when every node is its original position
 * scaled about `anchor` by one factor per axis, and the factors are a slider
 * value in one of the scaling modes. That is the case after the slider's own
 * write, after undo or redo of any number of scales, and after another
 * slider on the same network writes. A drag, a layout, or a node without an
 * original position is not explained.
 *
 * The `current` state is tried first, so an unchanged layout keeps it. Each
 * try stops at the first node that does not fit.
 */
export const inferSliderState = (
  nodeViews: Record<IdType, NodeView>,
  originals: Map<IdType, Position>,
  anchor: Anchor,
  current: SliderState,
): SliderState | undefined => {
  // Listed once: a `for...in` over 20,000 keys lists them all again each
  // time it starts, even when it stops at the first node
  const nodeIds: IdType[] = Object.keys(nodeViews)

  // With no nodes every value fits, and there is nothing scaled: x1.0
  if (nodeIds.length === 0) {
    return { scalingType: current.scalingType, value: 0 }
  }

  if (matches(nodeIds, nodeViews, originals, anchor, current)) {
    return current
  }

  // Read each axis' factor off one node far enough from the anchor
  let factorX: number | undefined
  let factorY: number | undefined
  for (const nodeId of nodeIds) {
    const original = originals.get(nodeId)
    if (original === undefined) {
      return undefined
    }
    const nv = nodeViews[nodeId]
    const dx = original[0] - anchor[0]
    const dy = original[1] - anchor[1]
    if (factorX === undefined && Math.abs(dx) >= MIN_SPAN) {
      factorX = (nv.x - anchor[0]) / dx
    }
    if (factorY === undefined && Math.abs(dy) >= MIN_SPAN) {
      factorY = (nv.y - anchor[1]) / dy
    }
    if (factorX !== undefined && factorY !== undefined) {
      break
    }
  }

  const valueOf = (factor: number | undefined): number | undefined => {
    if (factor === undefined || !(factor > 0)) {
      return undefined
    }
    const value = sliderValueOfScale(factor)
    return value >= SLIDER_MIN && value <= SLIDER_MAX ? value : undefined
  }
  const valueX = valueOf(factorX)
  const valueY = valueOf(factorY)
  const valueFor: Record<ScalingType, number | undefined> = {
    both: valueX ?? valueY,
    width: valueX,
    height: valueY,
  }

  const types: ScalingType[] = [
    current.scalingType,
    ...(['both', 'width', 'height'] as ScalingType[]).filter(
      (type) => type !== current.scalingType,
    ),
  ]
  for (const scalingType of types) {
    const value = valueFor[scalingType]
    if (value === undefined) {
      continue
    }
    // x1.0 is the same in every mode: keep the selected one
    const candidate: SliderState =
      value === 0
        ? { scalingType: current.scalingType, value }
        : { scalingType, value }
    // The current state was tried first
    const isCurrent =
      candidate.scalingType === current.scalingType &&
      candidate.value === current.value
    if (
      !isCurrent &&
      matches(nodeIds, nodeViews, originals, anchor, candidate)
    ) {
      return candidate
    }
  }
  return undefined
}
