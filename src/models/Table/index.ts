import { Column } from './Column'
import { Row } from './Row'

/**
 * Minimalistic table interface for node / edge attributes
 */
export interface Table {
  name: string // Human readable name of this table
  columns: Column[]
  rows: Row[]
}
