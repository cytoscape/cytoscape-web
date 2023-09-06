export const Panel = {
  LEFT: 'left',
  RIGHT: 'right',
  BOTTOM: 'bottom',
} as const

export type Panel = (typeof Panel)[keyof typeof Panel]
