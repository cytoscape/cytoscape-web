import { CSSProperties, ReactNode } from 'react'

/**
 * Item model for the toolbar dropdown menus. Replaces primereact's MenuItem —
 * this is exactly the subset of that shape the menus actually use, so the
 * menu definitions did not have to change when the renderer moved to MUI.
 */
export interface ToolbarMenuItem {
  label?: string
  icon?: ReactNode
  style?: CSSProperties
  /** Fully custom row; wins over label rendering when there are no items. */
  template?: ReactNode
  /** Non-empty items make this row a submenu parent. */
  items?: ToolbarMenuItem[]
  separator?: boolean
  disabled?: boolean
  command?: () => void
}
