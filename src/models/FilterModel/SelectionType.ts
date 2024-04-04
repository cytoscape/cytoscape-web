export const SelectionType = {
  SINGLE: 'single',
  MULTIPLE: 'multiple',
} as const

export type SelectionType = (typeof SelectionType)[keyof typeof SelectionType]
