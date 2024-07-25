import { ReactElement } from 'react'

export const RootMenu = {
  Data: 'Data',
  Edit: 'Edit',
} as const

export type RootMenu = (typeof RootMenu)[keyof typeof RootMenu]

export interface CyMenuItem {
  id: string
  parent: RootMenu
  menuItem: ReactElement
}
