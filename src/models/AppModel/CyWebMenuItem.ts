import { MenuPathElement } from './MenuPathElement'
import { RootMenu } from './RootMenu'

/**
 * The menu structure for this service.
 */
export interface CyWebMenuItem {
  root: RootMenu
  path: MenuPathElement[]
}
