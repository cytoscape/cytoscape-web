import { Table } from '.'
import { Node } from '../Network/Node'

export class TableFactory {
  /**
   * Create empty table
   *
   * @returns {Table}
   */
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
