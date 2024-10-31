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
  exact?: boolean,
): string[] => {
  let toBeSelected: string[] = [];

  const exactOptions = {
    threshold: 0,          // Only exact matches
    distance: 0,           // Match only if the entire string matches exactly
    useExtendedSearch: true, // Enables strict search modifiers
    limit: 1000,           // Set a high limit for maximum results
  };

  if (exact) {
    query = `="${query}"`;
  }

  if (operator === 'AND') {
    // Split tokens unless exact is true
    const tokens: string[] = exact ? [query] : query.split(/\s+/g);
    const results: string[][] = [];

    tokens.forEach((token: string) => {
      if (token !== '') {
        // Run search with exact options if exact is enabled
        const res = index.search(token, exact ? exactOptions : undefined);
        const ids: string[] = [];
        res.forEach((r: any) => {
          const objectId: string = r.item.id as string;
          ids.push(objectId);
        });
        results.push(ids);
      }
    });

    // Find the intersection of all results (AND search)
    toBeSelected = _.intersection(...results);
  } else {
    // OR search
    const result = index.search(query, exact ? exactOptions : undefined);

    result.forEach((r: any) => {
      const objectId: string = r.item.id as string;
      toBeSelected.push(objectId);
    });
  }

  return toBeSelected;
};