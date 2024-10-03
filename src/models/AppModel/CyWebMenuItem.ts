import { RootMenu } from './RootMenu'

export interface MenuPathElement {
  name: string
  gravity: number
}

export interface CyWebMenuItem {
  root: RootMenu
  path: MenuPathElement[]
}
