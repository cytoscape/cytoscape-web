import { AttributeName } from '../TableModel'

export interface ColumnConfiguration {
  attributeName: AttributeName
  visible: boolean
  columnWidth?: number
}

export interface TableConfig {
  columnConfiguration: ColumnConfiguration[]
  sortColumn?: AttributeName
  sortDirection?: 'ascending' | 'descending'
}

export interface TableDisplayConfiguration {
  nodeTable: TableConfig
  edgeTable: TableConfig
}

export interface VisualEditorProperties {
  nodeSizeLocked: boolean
  arrowColorMatchesEdge: boolean
  tableDisplayConfiguration: TableDisplayConfiguration
}

export type VisualStyleOptions = {
  visualEditorProperties: VisualEditorProperties
}
