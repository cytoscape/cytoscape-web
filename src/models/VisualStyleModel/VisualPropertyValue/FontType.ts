export const FontType = {
  Serif: 'serif',
  SansSerif: 'sans-serif',
  Monospace: 'monospace',
} as const

export type FontType = typeof FontType[keyof typeof FontType]
