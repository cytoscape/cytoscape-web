export const ValidationType = {
  String: 'string',
  Number: 'number',
  Digits: 'digits',
} as const

export type ValidationType =
  (typeof ValidationType)[keyof typeof ValidationType]
