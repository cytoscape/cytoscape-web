export const Panel = {
  LEFT: 'left',
  RIGHT: 'right',
  BOTTOM: 'bottom',
  TOP: 'top',
  CENTER: 'center',
} as const

export type Panel = (typeof Panel)[keyof typeof Panel]
