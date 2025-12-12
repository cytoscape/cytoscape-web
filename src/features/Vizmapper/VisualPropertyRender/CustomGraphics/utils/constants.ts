import { VALID_PIE_CHART_SLICE_INDEX_RANGE } from '../../../../../models/VisualStyleModel/impl/customGraphicsImpl'
import { ColorType } from '../../../../../models/VisualStyleModel/VisualPropertyValue/ColorType'

/**
 * Constants used throughout the CustomGraphics feature
 */
export const CHART_CONSTANTS = {
  SIZES: {
    DEFAULT: 120,
    PREVIEW: 80,
    RENDER: 60,
    VIEWBOX: 24, // Size for visual property view box (30x30 container)
  },
  PADDING: 8,
  DEFAULT_HOLE_SIZE: 0.4,
  MAX_SLICES: VALID_PIE_CHART_SLICE_INDEX_RANGE[1],
} as const

export const COLORS = {
  PRIMARY: '#1976d2',
  REMOVE: '#F50157',
  BORDER: '#e0e0e0',
  DEFAULT: '#CCCCCC' as ColorType,
  DEFAULT_FALLBACK: '#000000' as ColorType,
} as const

export const STYLES = {
  STROKE_WIDTH: 2,
  STROKE_COLOR: '#ffffff',
  ROTATION: -90, // Start from 12 o'clock
} as const

