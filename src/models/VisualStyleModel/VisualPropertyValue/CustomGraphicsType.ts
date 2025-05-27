import { AttributeName } from '../../TableModel/AttributeName'
import { ColorType } from './ColorType'

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
  Image: 'org.cytoscape.ding.customgraphics.bitmap.URLImageCustomGraphics',
  None: 'none',
} as const

export type CustomGraphicsNameType =
  (typeof CustomGraphicsNameType)[keyof typeof CustomGraphicsNameType]

export type JustificationType = 'left' | 'center' | 'right'

export type AnchorType = 'C' | 'N' | 'S' | 'E' | 'W'

export interface CustomGraphicsPositionType {
  justification: JustificationType
  marginX: number
  marginY: number
  entityAnchor: AnchorType
  graphicsAnchor: AnchorType
}

export interface CustomGraphicsType {
  type: CustomGraphicsTypeType
  name: CustomGraphicsNameType
  properties:
    | PieChartPropertiesType
    | RingChartPropertiesType
    | NonePropertiesType //| ImagePropertiesType
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

export interface NonePropertiesType {}

// TODO
// export interface ImagePropertiesType {
//   tag: string
//   url: string
//   id: number
// }
