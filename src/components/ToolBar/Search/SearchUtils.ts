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

/**
 * Splits a query string into tokens, respecting double-quoted phrases.
 * Commas and spaces are treated as delimiters.
 * If a token is surrounded by double quotes, the quotes are removed.
 * If a string has an unmatched double quote, it’s treated as a normal character.
 *
 * @param {string} query The input string to tokenize.
 * @returns {string[]} An array of tokens.
 */
function tokenizeQuery(query: string): string[] {
  // This regex matches either:
  // 1. A sequence of characters inside double quotes: "[^"]+"
  // 2. A sequence of characters that are not a comma or whitespace: [^,\s]+
  const regex = /"[^"]+"|[^,\s]+/g
  // Find all matches in the query string. If no matches, return an empty array.
  const matches = query.match(regex) || []
  // Process each match to remove quotes if they are balanced.
  return matches
    .map((token) => {
      // Check if the token starts and ends with a double quote
      if (token.startsWith('"') && token.endsWith('"')) {
        // If so, remove the quotes and return the inner content.
        return token.slice(1, -1)
      }
      // Otherwise, return the token as is.
      return token
    })
    .filter((t) => t !== '')
}

export const runSearch = (
  index: Fuse<Record<string, ValueType>>,
  query: string,
  operator: Operator,
  equals?: boolean,
): string[] => {
  const tokens = tokenizeQuery(query)

  const results: string[][] = tokens.map((t) => {
    const tokenHasSpaces = t.includes(' ')
    let searchToken = ''
    if (equals) {
      if (tokenHasSpaces) {
        searchToken = `="${t}"`
      } else {
        searchToken = `=${t}`
      }
    } else {
      searchToken = t
    }
    const searchResults = index.search(searchToken)
    return searchResults.map((r) => r.item.id as string)
  })

  if (operator === 'AND') {
    return _.intersection(...results)
  } else {
    return _.union(...results)
  }
}
