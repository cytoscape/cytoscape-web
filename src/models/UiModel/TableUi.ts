export interface ColumnUIState {
  width: number
  visible?: boolean
  order?: number
}

/**
 * User interface states shared as a global value
 */
export interface TableUIState {
  columnUiState: Record<string, ColumnUIState>
  activeTabIndex: number
}
