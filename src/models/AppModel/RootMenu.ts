/**
 * The type for the pre-defined root menu, e.g. 'Data' or 'Edit'
 */
export const RootMenu = {
  Data: 'Data',
  Edit: 'Edit',
  Layout: 'Layout',
  Analysis: 'Analysis',
  Apps: 'Apps',
  Help: 'Help',
} as const

export type RootMenu = (typeof RootMenu)[keyof typeof RootMenu]
