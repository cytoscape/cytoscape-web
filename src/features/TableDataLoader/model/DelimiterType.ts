export const DelimiterType = {
  Comma: ',',
  Colon: ':',
  Semicolon: ';',
  BackSlash: '\\',
  Slash: '/',
  Pipe: '|',
  Tab: '\t',
  Space: ' ',
} as const

export type DelimiterType =
  | (typeof DelimiterType)[keyof typeof DelimiterType]
  | string

// UI state values for file delimiter selection
export type FileDelimiterState = 'auto' | 'custom' | 'tab' | 'space' | string
