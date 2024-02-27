export interface MenuItem {
  // Unique ID of the menu item (e.g. 'createEmptyNetwork' or 'findNeighbors')
  id: string

  // The root menu item ID (e.g. 'apps' or 'help')
  parentId: string

  // Human-readable name of the menu item
  name: string

  // The order of the menu item under its parent. Lower numbers come first.
  weight: number
}
