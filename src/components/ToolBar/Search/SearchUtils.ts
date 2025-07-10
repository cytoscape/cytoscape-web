import Fuse from 'fuse.js'
import {
  Column,
  Table,
  ValueType,
  ValueTypeName,
} from '../../../models/TableModel'
import { Operator } from '../../../models/FilterModel/Search'
import _ from 'lodash'

/**
 * Generates a Fuse index from a data table
 *
 * @param table Data table to be indexed. Node or Edge table
 *
 * @returns Fuse index
 */
export const createFuseIndex = (
  table: Table,
): Fuse<Record<string, ValueType>> => {
  const list = Array<Record<string, ValueType>>()

  const { rows, columns } = table

  // Pick string columns and list_string columns
  const keySet = new Set<string>()
  // keySet.add('id')
  columns.forEach((column: Column) => {
    const { name, type } = column
    if (type === ValueTypeName.String || type === ValueTypeName.ListString) {
      keySet.add(name)
    }
  })

  const keyList = Array.from(rows.keys())
  keyList.forEach((key: string) => {
    const row = rows.get(key)
    if (row !== undefined) {
      const newRow: Record<string, ValueType> = {}

      newRow.id = key
      keySet.forEach((columnKey: string) => {
        newRow[columnKey] = row[columnKey]
      })
      list.push(newRow)
    }
  })
  const options = {
    includeScore: true,
    includeMatches: true,
    threshold: 0.0,
    useExtendedSearch: true,
    ignoreLocation: true,
    keys: Array.from(keySet),
  }

  return new Fuse(list, options)
}

export const filterColumns = (
  columns: Column[],
  types: ValueTypeName[],
): Set<string> => {
  const filteredColumns: Set<string> = new Set()
  columns.forEach((column: Column) => {
    types.forEach((type: ValueTypeName) => {
      if (column.type === type) {
        filteredColumns.add(column.name)
      }
    })
  })
  return filteredColumns
}

export const runSearch = (
  index: Fuse<Record<string, ValueType>>,
  query: string,
  operator: Operator,
  contains?: boolean,
): string[] => {
  const tokens = query.replace(/,/g, ' ').split(/[\s,]+/g)

  const results: string[][] = tokens.map((t) => {
    const searchToken = !contains ? `=${t}` : t
    const searchResults = index.search(searchToken)
    return searchResults.map((r) => r.item.id as string)
  })

  if (operator === 'AND') {
    return _.intersection(...results)
  } else {
    return _.union(...results)
  }
}
