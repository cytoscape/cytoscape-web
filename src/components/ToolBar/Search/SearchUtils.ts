import Fuse from 'fuse.js'
import { Table, ValueType } from '../../../models/TableModel'

/**
 * Generates a Fuse index from a data table
 *
 * @param table Data table to be indexed. Node or Edge table
 *
 * @returns Fuse index
 */
export const createFuseIndex = <T>(table: Table): T => {
  const list = Array<Record<string, ValueType>>()
  table.rows.forEach((row: Record<string, ValueType>, key: string) => {
    list.push({ id: key, ...row })
  })

  const keys: string[] = ['id']
  table.columns.forEach((column) => keys.push(column.name))

  const options = {
    includeScore: true,
    includeMatches: true,
    threshold: 0.0,
    useExtendedSearch: true,
    ignoreLocation: true,
    keys,
  }

  return new Fuse(list, options) as T
}
