import Fuse from 'fuse.js'
import intersection from 'lodash/intersection'
import union from 'lodash/union'

import { Operator } from '../../../models/FilterModel/Search'
import {
  Column,
  Table,
  ValueType,
  ValueTypeName,
} from '../../../models/TableModel'

/**
 * Generates a Fuse.js index from a data table for fast text search.
 *
 * Only String and ListString columns are indexed. The index is configured with:
 * - Extended search syntax enabled (supports ^, $, !, =, etc.)
 * - No fuzzy threshold (exact matching by default)
 * - Location-agnostic matching (matches anywhere in text)
 *
 * @param table Data table to be indexed (Node or Edge table)
 * @returns Fuse.js index ready for searching
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

/**
 * Filters columns by their value type.
 *
 * @param columns Array of columns to filter
 * @param types Array of value types to include
 * @returns Set of column names that match the specified types
 */
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

/**
 * Executes a search query against a Fuse.js index.
 *
 * The query is tokenized, and each token is searched independently.
 * Results are combined based on the operator (AND/OR).
 *
 * @param index Fuse.js index to search
 * @param query Raw query string from user
 * @param operator Boolean operator to combine token results ('AND' or 'OR')
 * @param equals If true, uses exact matching; if false, uses fuzzy matching
 * @returns Array of matching row IDs (as strings)
 */
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
    return intersection(...results)
  } else {
    return union(...results)
  }
}
