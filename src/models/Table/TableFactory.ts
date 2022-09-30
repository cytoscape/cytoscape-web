import { Table } from '.'
import { Node } from '../Network/Node'

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
