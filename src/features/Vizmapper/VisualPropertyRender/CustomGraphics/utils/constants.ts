import { VALID_PIE_CHART_SLICE_INDEX_RANGE } from '../../../../../models/VisualStyleModel/impl/customGraphicsImpl'
import { ColorType } from '../../../../../models/VisualStyleModel/VisualPropertyValue/ColorType'
import { CustomGraphicsNameType } from '../../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'

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

/**
 * The custom graphic kinds a user may author from scratch in the Vizmapper.
 *
 * `Image` is deliberately absent. Cytoscape Desktop cannot render image custom
 * graphics carried in a CX2 file at all: it loads custom-graphic image bytes from
 * its own session `CustomGraphicsManager` pool and never fetches
 * `properties.url` — for any URL scheme, hosted or inline — so an image authored
 * here shows up as a "?" placeholder the moment the network reaches Desktop.
 * Rather than ship a picker that quietly produces broken files, the option is
 * withheld.
 *
 * This restricts *authoring only*. Images still render everywhere in Cytoscape
 * Web (defaults and bypasses arriving from an imported CX2, and the passthrough
 * path), and a string column of image URLs can still drive `nodeImageChart*`
 * through a passthrough mapping — the documented power-user route, which carries
 * its own Desktop advisory in the Vizmapper.
 *
 * To re-enable image authoring once Desktop parity exists, add
 * `CustomGraphicsNameType.Image` back to this list — that is the whole change.
 *
 * See docs/design/custom-graphics-image/custom-graphics-image-passthrough.md
 */
export const AUTHORABLE_CUSTOM_GRAPHIC_KINDS = [
  CustomGraphicsNameType.PieChart,
  CustomGraphicsNameType.RingChart,
] as const

export const IMAGE_CONSTANTS = {
  MAX_FILE_SIZE_BYTES: 2 * 1024 * 1024, // 2 MB
  MAX_FILE_SIZE_LABEL: '2 MB',
  ACCEPTED_TYPES: [
    'image/png',
    'image/jpeg',
    'image/svg+xml',
    'image/gif',
    'image/webp',
  ],
  ACCEPTED_EXTENSIONS: '.png,.jpg,.jpeg,.svg,.gif,.webp',
} as const
