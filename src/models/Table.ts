import { Node } from './Network'

/**
 * Compatible attribute data types
 */
export type ValueType = string | number | boolean | ValueType[]

export type ValueTypeName =
  | 'string'
  | 'long'
  | 'integer'
  | 'double'
  | 'boolean'
  | 'list_of_string'
  | 'list_of_long'
  | 'list_of_integer'
  | 'list_of_double'
  | 'list_of_boolean'

export interface RowData {
  [key: string]: ValueType
}

export interface Column {
  id: string
  name?: string // (Optional) Human-readable name
  type: ValueTypeName
}

export interface Row {
  readonly key: BigInt
  data: RowData
}

/**
 * Minimalistic table interface for node / edge attributes
 */
export interface Table {
  name: string // Human readable name of this table
  columns: Column[]
  rows: Row[]
}

export class TableFactory {
  /**
   * Create empty table
   *
   * @returns {Table}
   */

  // ESLint throws an error if there is a class with only static methods
  // as a temporary solution, define a noop function to avoid the lint error
  public noop(): void {}

  public static createTable(name: string): Table {
    return {
      name,
      rows: [],
      columns: [],
    }
  }

  public static createTableFromNodes(name: string, nodes: Node): Table {
    // TBD
    return {
      name,
      rows: [],
      columns: [],
    }
  }
}
