import { IdType } from '@/models/IdType'
import { Table } from '@/models/TableModel'

/**
 * Ids of the nodes with any string attribute (or string list entry)
 * containing `query`, ignoring case. An empty query matches nothing.
 */
export const searchNodes = (nodeTable: Table, query: string): IdType[] => {
  const needle = query.trim().toLowerCase()
  if (needle === '') return []

  const matches = (value: unknown): boolean =>
    Array.isArray(value)
      ? value.some(matches)
      : typeof value === 'string' && value.toLowerCase().includes(needle)

  const ids: IdType[] = []
  nodeTable.rows.forEach((row, id) => {
    if (Object.values(row).some(matches)) ids.push(id)
  })
  return ids
}
