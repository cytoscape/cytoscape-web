export const HorizontalAlignType = {
  Left: 'left',
  Center: 'center',
  Right: 'right',
} as const

export type HorizontalAlignType =
  (typeof HorizontalAlignType)[keyof typeof HorizontalAlignType]

export const VerticalAlignType = {
  Top: 'top',
  Center: 'center',
  Bottom: 'bottom',
} as const

export type VerticalAlignType =
  (typeof VerticalAlignType)[keyof typeof VerticalAlignType]

export type NodeLabelPositionValueType =
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
export interface NodeLabelPositionType {
  HORIZONTAL_ALIGN: NodeLabelPositionValueType
  VERTICAL_ALIGN: NodeLabelPositionValueType
  HORIZONTAL_ANCHOR: NodeLabelPositionValueType
  VERTICAL_ANCHOR: NodeLabelPositionValueType
  MARGIN_X: number
  MARGIN_Y: number
  JUSTIFICATION: NodeLabelPositionValueType
}
