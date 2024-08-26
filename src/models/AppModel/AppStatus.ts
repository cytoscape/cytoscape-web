/**
 * Status of the external app
 */
export const AppStatus = {
  Active: 'active',
  Inactive: 'inactive',
  Error: 'error',
} as const

export type AppStatus = (typeof AppStatus)[keyof typeof AppStatus]
