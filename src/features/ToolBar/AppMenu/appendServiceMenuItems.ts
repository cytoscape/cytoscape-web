import { ToolbarMenuItem as MenuItem } from '@/features/ToolBar/menuItemModel'

const isSubmenu = (item: MenuItem): boolean =>
  item.items !== undefined && item.items.length > 0

/**
 * Add a menu's service-app items to its built-in items.
 *
 * A service submenu whose label matches a built-in submenu at the same level
 * is merged into it, recursively, so an app at `Data > Import > ...` lands in
 * the existing Import submenu instead of a second one at the bottom (#722).
 * Everything else is appended after a separator, as before. Labels match
 * exactly, the same rule `createMenuItems` uses to merge app paths.
 *
 * The host items are not mutated: merged submenus are shallow copies.
 */
export const appendServiceMenuItems = (
  hostItems: MenuItem[],
  serviceItems: MenuItem[],
): MenuItem[] => {
  const merged = [...hostItems]
  const unmatched: MenuItem[] = []

  serviceItems.forEach((serviceItem) => {
    const index = isSubmenu(serviceItem)
      ? merged.findIndex(
          (item) => isSubmenu(item) && item.label === serviceItem.label,
        )
      : -1
    if (index === -1) {
      unmatched.push(serviceItem)
      return
    }
    const hostItem = merged[index]
    merged[index] = {
      ...hostItem,
      items: appendServiceMenuItems(
        hostItem.items ?? [],
        serviceItem.items ?? [],
      ),
    }
  })

  return unmatched.length > 0
    ? [...merged, { separator: true }, ...unmatched]
    : merged
}
