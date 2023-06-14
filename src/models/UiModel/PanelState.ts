export const PanelState = {
  OPEN: 'open',
  CLOSED: 'closed',
  HIDDEN: 'hidden',
  MINIMIZED: 'minimized',
} as const

export type PanelState = (typeof PanelState)[keyof typeof PanelState]
