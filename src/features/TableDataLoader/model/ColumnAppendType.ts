export const ColumnAppendType = {
  NotImported: 'notimported',
  Key: 'key',
  Attribute: 'attribute',
} as const

export type ColumnAppendType =
  (typeof ColumnAppendType)[keyof typeof ColumnAppendType]
