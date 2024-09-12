export const MappingFunctionType = {
  Passthrough: 'passthrough',
  Discrete: 'discrete',
  Continuous: 'continuous',
} as const

export type MappingFunctionType =
  (typeof MappingFunctionType)[keyof typeof MappingFunctionType]
