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
  /**
   * Heading naming the group of rows that follows. Not focusable and not
   * activatable — arrow navigation skips it.
   */
  sectionHeader?: string
  /**
   * Non-interactive content row, e.g. a footnote closing the menu. Skipped by
   * arrow navigation like `sectionHeader`; use `template` for a row the user
   * can actually click.
   */
  staticContent?: ReactNode
}
