import { IdType } from '../../models/IdType'

/** A node position: x, y and the optional z. */
export type Position = [number, number, number?]

/** Point the positions are scaled about: [x, y] */
export type Anchor = [number, number]

/** Per-axis scaling factors: [x, y, z] */
export type ScaleFactors = [number, number, number]

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
 * Inverse of {@link scalePosition}: the unscaled position that `scaled`
 * came from.
 */
export const unscalePosition = (
  scaled: Position,
  anchor: Anchor,
  [scaleX, scaleY, scaleZ]: ScaleFactors,
): [number, number, number] => [
  scaleCoordinate(scaled[0], anchor[0], 1 / scaleX),
  scaleCoordinate(scaled[1], anchor[1], 1 / scaleY),
  (scaled[2] ?? 0) / scaleZ,
]
