export const HoritzontalAlignType = {
  Left: 'left',
  Center: 'center',
  Right: 'right',
} as const

export type HoritzontalAlignType =
  typeof HoritzontalAlignType[keyof typeof HoritzontalAlignType]

export const VerticalAlignType = {
  Top: 'top',
  Center: 'center',
  Bottom: 'bottom',
} as const

export type VerticalAlignType =
  typeof VerticalAlignType[keyof typeof VerticalAlignType]
