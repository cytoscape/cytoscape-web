import { CHART_CONSTANTS } from './constants'

/**
 * Calculates chart dimensions based on provided size or width/height
 */
export function calculateChartDimensions(
  size?: number,
  width?: number,
  height?: number,
): {
  chartSize: number
  containerWidth: number
  containerHeight: number
} {
  const chartSize =
    size || Math.min(width || CHART_CONSTANTS.SIZES.DEFAULT, height || CHART_CONSTANTS.SIZES.DEFAULT)
  const containerWidth = width || chartSize
  const containerHeight = height || chartSize
  return { chartSize, containerWidth, containerHeight }
}

/**
 * Calculates radii and viewBox size for chart rendering
 */
export function calculateRadii(
  chartSize: number,
  holeSize?: number,
): {
  outerRadius: number
  innerRadius: number | undefined
  viewBoxSize: number
} {
  const outerRadius = chartSize / 2 - CHART_CONSTANTS.PADDING
  const innerRadius = holeSize !== undefined ? outerRadius * holeSize : undefined
  const viewBoxSize = 2 * outerRadius
  return { outerRadius, innerRadius, viewBoxSize }
}

/**
 * Converts degrees to radians
 */
export function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Calculates slice angle for equal distribution
 */
export function calculateSliceAngle(dataColumnCount: number): number {
  return 360 / dataColumnCount
}

