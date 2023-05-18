export const Visibility = {
  PUBLIC: 'PUBLIC',
  PRIVATE: 'PRIVATE',
} as const

export type Visibility = typeof Visibility[keyof typeof Visibility]
