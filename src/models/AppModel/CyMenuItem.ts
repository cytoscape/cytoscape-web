import { ReactElement } from 'react'
import { RootMenu } from './RootMenu'

export interface CyMenuItem {
  // Unique ID of the menu item
  id: string

  // Parent menu of the menu item
  parent: RootMenu

  // Actual menu item to be rendered
  menuItem: ReactElement
}
