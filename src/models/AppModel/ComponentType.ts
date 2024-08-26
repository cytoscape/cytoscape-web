export const ComponentType = {
  Menu: 'menu',
  Panel: 'panel',
} as const

export type ComponentType = (typeof ComponentType)[keyof typeof ComponentType]
