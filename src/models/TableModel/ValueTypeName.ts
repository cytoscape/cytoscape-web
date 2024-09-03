export const ValueTypeName = {
  String: 'string',
  Long: 'long',
  Integer: 'integer',
  Double: 'double',
  Boolean: 'boolean',
  ListString: 'list_of_string',
  ListLong: 'list_of_long',
  ListInteger: 'list_of_integer',
  ListDouble: 'list_of_double',
  ListBoolean: 'list_of_boolean',
} as const

export type ValueTypeName = (typeof ValueTypeName)[keyof typeof ValueTypeName]
