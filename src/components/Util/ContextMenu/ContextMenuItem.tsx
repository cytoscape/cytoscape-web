export interface ContextMenuItem {
  label: string
  action: () => void
  disabled?: boolean
}
