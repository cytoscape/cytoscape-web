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
  /**
   * The row's shortcuts for assistive technology, in `aria-keyshortcuts`
   * form (e.g. "Control+A Meta+A"); the visible label is the template's
   */
  keyShortcuts?: string
  command?: () => void
}
