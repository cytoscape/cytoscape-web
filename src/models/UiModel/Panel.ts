export const Panel = {
  LEFT: 'left',
  RIGHT: 'right',
} as const

export type Panel = (typeof Panel)[keyof typeof Panel]
