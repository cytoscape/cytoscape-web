export const HorizontalAlignType = {
  Left: 'left',
  Center: 'center',
  Right: 'right',
} as const

export type HorizontalAlignType =
  typeof HorizontalAlignType[keyof typeof HorizontalAlignType]

export const VerticalAlignType = {
  Top: 'top',
  Center: 'center',
  Bottom: 'bottom',
} as const

export type VerticalAlignType =
  typeof VerticalAlignType[keyof typeof VerticalAlignType]
