import { Column } from '../../../../../models/TableModel/Column'
import { ValueTypeName } from '../../../../../models/TableModel/ValueTypeName'
import { ValueType } from '../../../../../models/TableModel/ValueType'

/**
 * Checks if a column is numeric based on its type and values.
 *
 * A column is considered numeric if:
 * 1. The column type is Integer, Double, or Long, OR
 * 2. All non-null values in the column are numbers (integers or floats)
 *
 * @param column - The column to check
 * @param values - Array of values from the column (can include null/undefined)
 * @returns true if the column is numeric, false otherwise
 */
export function isNumericColumn(
  column: Column,
  values: (ValueType | null | undefined)[],
): boolean {
  // Filter out null/undefined values
  const nonNullValues = values.filter((v) => v != null)

  // If no non-null values, column is not numeric
  if (nonNullValues.length === 0) return false

  // Check if column type is numeric
  const isNumericType =
    column.type === ValueTypeName.Integer ||
    column.type === ValueTypeName.Double ||
    column.type === ValueTypeName.Long

  // Check if all non-null values are numbers
  const allInts = nonNullValues.every((v) => Number.isInteger(v))
  const allNums = nonNullValues.every((v) => typeof v === 'number')

  // Column is numeric if:
  // 1. All non-null values are integers, OR
  // 2. All non-null values are numbers, OR
  // 3. Column type is explicitly numeric
  return allInts || allNums || isNumericType
}

/**
 * Gets all numeric column names from a table.
 *
 * @param columns - Array of columns to check
 * @param rows - Map of rows, where each row is a record of attribute names to values
 * @returns Array of column names that are numeric
 */
export function getNumericColumnNames(
  columns: Column[],
  rows: Map<string, Record<string, ValueType>>,
): string[] {
  if (!rows || rows.size === 0) return []

  const rowArray = Array.from(rows.values())

  return columns
    .filter((col) => {
      const values = rowArray.map((row) => row[col.name])
      return isNumericColumn(col, values)
    })
    .map((col) => col.name)
}

/**
 * Checks if a table has any numeric columns.
 *
 * @param columns - Array of columns to check
 * @param rows - Map of rows, where each row is a record of attribute names to values
 * @returns true if at least one numeric column exists, false otherwise
 */
export function hasNumericColumns(
  columns: Column[] | undefined,
  rows: Map<string, Record<string, ValueType>> | undefined,
): boolean {
  if (!columns || !rows || rows.size === 0) return false

  const rowArray = Array.from(rows.values())

  return columns.some((col) => {
    const values = rowArray.map((row) => row[col.name])
    return isNumericColumn(col, values)
  })
}
