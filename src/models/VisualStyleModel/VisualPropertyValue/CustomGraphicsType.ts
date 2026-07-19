import type { AttributeName } from '../../TableModel/AttributeName'
import type { ColorType } from './ColorType'

export const CustomGraphicsTypeType = {
  Chart: 'chart',
  Image: 'image',
  None: 'none',
} as const

export type CustomGraphicsTypeType =
  (typeof CustomGraphicsTypeType)[keyof typeof CustomGraphicsTypeType]

export const CustomGraphicsNameType = {
  PieChart: 'org.cytoscape.PieChart',
  RingChart: 'org.cytoscape.RingChart',
  // Raster (PNG/JPEG/GIF/BMP) images. Cytoscape Desktop decodes these via ImageIO.
  Image: 'org.cytoscape.ding.customgraphics.bitmap.URLImageCustomGraphics',
  // Vector images. Cytoscape Desktop uses a SEPARATE custom-graphics factory for SVG;
  // labeling SVG content as the bitmap class above makes Desktop try to raster-decode
  // it and render a "?" placeholder instead.
  SVGImage: 'org.cytoscape.ding.customgraphics.image.SVGCustomGraphics',
  None: 'none',
} as const

export type CustomGraphicsNameType =
  (typeof CustomGraphicsNameType)[keyof typeof CustomGraphicsNameType]

/**
 * Both the raster and vector classes are "image" custom graphics as far as Cytoscape
 * Web's model, UI, and render dispatch are concerned. Use this instead of comparing
 * against `CustomGraphicsNameType.Image` alone, so imported Desktop SVG custom graphics
 * are recognized too.
 */
export const isImageCustomGraphicsName = (name: string): boolean =>
  name === CustomGraphicsNameType.Image ||
  name === CustomGraphicsNameType.SVGImage

/**
 * Decide whether a custom-graphics image URL is SVG (vector) content. Covers inline SVG,
 * `data:image/svg+xml` URIs, and URLs whose path ends in `.svg`.
 */
export const isSvgImageUrl = (url: string): boolean => {
  const u = url.trim()
  return (
    u.startsWith('<svg') ||
    u.startsWith('data:image/svg+xml') ||
    /\.svg(\?|#|$)/i.test(u)
  )
}

export type JustificationType = 'left' | 'center' | 'right'

export type AnchorType = 'C' | 'N' | 'S' | 'E' | 'W'

export interface CustomGraphicsPositionType {
  JUSTIFICATION: JustificationType
  MARGIN_X: number
  MARGIN_Y: number
  ENTITY_ANCHOR: AnchorType
  GRAPHICS_ANCHOR: AnchorType
}

export interface CustomGraphicsType {
  type: CustomGraphicsTypeType
  name: CustomGraphicsNameType
  properties:
    | PieChartPropertiesType
    | RingChartPropertiesType
    | NonePropertiesType
    | ImagePropertiesType
}

export interface PieChartPropertiesType {
  cy_range: [number, number]
  cy_colorScheme: string
  cy_startAngle: number
  cy_colors: ColorType[]
  cy_dataColumns: AttributeName[]
}

export interface RingChartPropertiesType {
  cy_range: [number, number]
  cy_colorScheme: string
  cy_holeSize: number
  cy_startAngle: number
  cy_colors: ColorType[]
  cy_dataColumns: AttributeName[]
}

export type NonePropertiesType = Record<string, never>

export interface ImagePropertiesType {
  url: string
  tag?: string
  id?: number
}
