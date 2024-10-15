import { MenuItem } from 'primereact/menuitem'
import { MenuPathElement } from '../../../models/AppModel/MenuPathElement'
import { ServiceApp } from '../../../models/AppModel/ServiceApp'

const path2menu = (path: MenuPathElement[]): MenuItem => {
  if (path.length === 0) {
    throw new Error('Menu path is empty')
  }

  // Case 1: Single menu item
  if (path.length === 1) {
    const item: MenuPathElement = path[0]
    const baseMenu: MenuItem = {
      label: item.name,
      items: [],
    }
    return baseMenu
  }

  // Case 2: Depth > 1

  const baseMenu: MenuItem = {
    label: path[0].name,
    items: [],
  }

  let currentMenuItem: MenuItem = baseMenu
  for (let i = 1; i < path.length; i++) {
    const item: MenuPathElement = path[i]
    const newMenuItem: MenuItem = {
      label: item.name,
      items: [],
    }
    if (currentMenuItem.items === undefined) {
      currentMenuItem.items = []
    }
    currentMenuItem.items = [newMenuItem]
    currentMenuItem = newMenuItem
  }
  return baseMenu
}

export const createMenuItems = (
  serviceApps: Record<string, ServiceApp>,
): MenuItem => {
  let baseMenu: MenuItem = { label: 'No menu items', items: [] }
  const appIds: string[] = Object.keys(serviceApps)
  appIds.forEach((appId: string) => {
    const app: ServiceApp = serviceApps[appId]
    const { cyWebMenuItem } = app
    const { path } = cyWebMenuItem
    baseMenu = path2menu(path)
  })

  return baseMenu
}
