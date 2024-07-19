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
