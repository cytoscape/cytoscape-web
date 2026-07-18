import { RootMenu } from '../RootMenu'
import { ServiceApp } from '../ServiceApp'

/**
 * The top-level menus that currently have a component wired to host service
 * apps. A service app whose `cyWebMenuItem.root` resolves to a menu that is not
 * in this list is placed under the default (Apps) menu instead of vanishing.
 *
 * CW-589 introduced routing for Tools and Apps. CW-665 expands this to every
 * top-level menu.
 */
export const SUPPORTED_ROOT_MENUS: RootMenu[] = [
  RootMenu.Tools,
  RootMenu.Apps,
]

/**
 * The menu a service app falls back to when its requested root is missing,
 * unrecognized, or not backed by a menu component.
 */
export const DEFAULT_ROOT_MENU: RootMenu = RootMenu.Apps

/**
 * Resolve a raw `root` string (as sent in service metadata) to a known
 * RootMenu value. Matching is case-insensitive and tolerant of surrounding
 * whitespace. Returns undefined when the string does not name a RootMenu.
 */
export const parseRootMenu = (
  root: string | undefined | null,
): RootMenu | undefined => {
  if (root === undefined || root === null) {
    return undefined
  }
  const normalized = root.trim().toLowerCase()
  return Object.values(RootMenu).find((r) => r.toLowerCase() === normalized)
}

export interface RootMenuResolution {
  // The menu the app will actually be rendered under.
  root: RootMenu
  // The raw root string from the service metadata (for messaging).
  requested?: string
  // True when the requested root named a supported menu; false when the app
  // was routed to the default menu as a fallback.
  valid: boolean
}

/**
 * Decide which top-level menu a service app should be placed under, given its
 * requested root. Unknown or unsupported roots fall back to the default (Apps)
 * menu, with `valid: false` so callers can warn the developer/user.
 */
export const resolveRootMenu = (
  root: string | undefined | null,
  supported: RootMenu[] = SUPPORTED_ROOT_MENUS,
): RootMenuResolution => {
  const parsed = parseRootMenu(root)
  if (parsed !== undefined && supported.includes(parsed)) {
    return { root: parsed, requested: root ?? undefined, valid: true }
  }
  return {
    root: DEFAULT_ROOT_MENU,
    requested: root ?? undefined,
    valid: false,
  }
}

/**
 * Filter a map of service apps down to those that resolve to a given top-level
 * menu. Apps with an unsupported root are grouped under the default menu.
 */
export const filterServiceAppsByRoot = (
  serviceApps: Record<string, ServiceApp>,
  targetRoot: RootMenu,
  supported: RootMenu[] = SUPPORTED_ROOT_MENUS,
): Record<string, ServiceApp> => {
  const result: Record<string, ServiceApp> = {}
  Object.entries(serviceApps).forEach(([url, app]) => {
    const { root } = resolveRootMenu(app.cyWebMenuItem?.root, supported)
    if (root === targetRoot) {
      result[url] = app
    }
  })
  return result
}
