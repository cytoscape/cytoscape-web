export const VisibilityType = {
  Element: 'element',
  None: 'none',
} as const

export type VisibilityType =
  (typeof VisibilityType)[keyof typeof VisibilityType]
