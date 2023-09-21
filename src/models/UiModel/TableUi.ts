import { IdType } from '../IdType'
import { AttributeName } from '../TableModel'

export interface ColumnUIState {
  width: number
  visible?: boolean
  order?: number
}

/**
 * User interface states shared as a global value
 */
export interface TableUIState {
  columnUiState: Record<IdType, Map<AttributeName, ColumnUIState>>
  activeTabIndex: number
}
