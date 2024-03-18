import { ValueTypeName, ValueType } from '../../../../models/TableModel'
import { ColumnAppendState } from '../ColumnAppendState'
import { ColumnAssignmentState } from '../ColumnAssignmentState'
import { DelimiterType } from '../DelimiterType'
import { DataTableValue } from 'primereact/datatable'

// check if a value matches a given type
export function valueMatchesType(
  value: string,
  type: ValueTypeName,
  delimiterArg?: DelimiterType,
): boolean {
  const delimiter = delimiterArg ?? DelimiterType.Comma
  switch (type) {
    case ValueTypeName.String:
      return typeof value === 'string'
    case ValueTypeName.Integer:
    case ValueTypeName.Long:
      return /^[+-]?\d+$/.test(value)
    case ValueTypeName.Double:
      return /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(value)
    case ValueTypeName.Boolean:
      return /^true|false$/i.test(value)
    case ValueTypeName.ListString:
      return typeof value === 'string'
    case ValueTypeName.ListInteger:
    case ValueTypeName.ListLong:
      try {
        return value
          .split(delimiter)
          .every((item) => /^[+-]?\d+$/.test(item.trim()))
      } catch {
        return false
      }
    case ValueTypeName.ListDouble:
      try {
        return value
          .split(delimiter)
          .every((item) =>
            /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(item.trim()),
          )
      } catch {
        return false
      }
    case ValueTypeName.ListBoolean:
      return value
        .split(delimiter)
        .every((item) => /^true|false$/i.test(item.trim()))
    default:
      return false
  }
}

// convert a string value to the appropriate type
export function parseValue(
  value: string,
  type: ValueTypeName,
  delimiter?: DelimiterType,
): ValueType {
  const delimiterArg = delimiter ?? DelimiterType.Comma
  switch (type) {
    case ValueTypeName.String:
      return value
    case ValueTypeName.Integer:
      return parseInt(value)
    case ValueTypeName.Long:
      return parseInt(value)
    case ValueTypeName.Double:
      return parseFloat(value)
    case ValueTypeName.Boolean:
      return value.toLowerCase() === 'true'
    case ValueTypeName.ListString:
      return value.split(delimiterArg)
    case ValueTypeName.ListInteger:
      return value.split(delimiterArg).map((v) => parseInt(v))
    case ValueTypeName.ListLong:
      return value.split(delimiterArg).map((v) => parseInt(v))
    case ValueTypeName.ListDouble:
      return value.split(delimiterArg).map((v) => parseFloat(v))
    case ValueTypeName.ListBoolean:
      return value.split(delimiterArg).map((v) => v.toLowerCase() === 'true')
    default:
      return value
  }
}

export const validateColumnValues = (
  column: ColumnAssignmentState | ColumnAppendState,
  rows: DataTableValue[],
): number[] => {
  const values = rows.map((row) => row[column.name])
  const invalidRows: number[] = []

  values.forEach((value, index) => {
    if (!valueMatchesType(value, column.dataType, column.delimiter)) {
      invalidRows.push(index)
    }
  })

  return invalidRows
}

export type TypeInferenceResult = {
  typeCounts: Map<ValueTypeName, number>
  columnTypeIsInclusive: boolean
  columnTypesWithMaxMatches: ValueTypeName[]
  inferredType?: ValueTypeName
}

// given a list of string values from a column, infer the type of the column
export function inferColumnType(values: string[]): TypeInferenceResult {
  const typeOrder: ValueTypeName[] = [
    ValueTypeName.String,
    ValueTypeName.Long,
    ValueTypeName.Integer,
    ValueTypeName.Double,
    ValueTypeName.Boolean,
    ValueTypeName.ListString,
    ValueTypeName.ListLong,
    ValueTypeName.ListInteger,
    ValueTypeName.ListDouble,
    ValueTypeName.ListBoolean,
  ]

  // record of how many column values match each value type
  const valueTypeCounts: Map<ValueTypeName, number> = new Map()

  let maxNumValuesMatching = 0
  // flag set when only one type has the most matches
  let columnTypeIsInclusive = true
  // list of types that may be tied for the most matches
  const columnTypesWithMaxMatches: ValueTypeName[] = []
  let winningType: ValueTypeName | undefined

  for (const type of typeOrder) {
    let numValuesMatchingCurrentType = 0

    for (const value of values) {
      // Check if the value matches the current type
      if (valueMatchesType(value, type)) {
        numValuesMatchingCurrentType++
      }
    }

    valueTypeCounts.set(type, numValuesMatchingCurrentType)

    if (numValuesMatchingCurrentType > maxNumValuesMatching) {
      maxNumValuesMatching = numValuesMatchingCurrentType
      columnTypeIsInclusive = true
      columnTypesWithMaxMatches.length = 0
      winningType = type
    } else if (numValuesMatchingCurrentType === maxNumValuesMatching) {
      columnTypeIsInclusive = false
      columnTypesWithMaxMatches.push(type)
    }
  }

  return {
    typeCounts: valueTypeCounts,
    columnTypeIsInclusive,
    columnTypesWithMaxMatches,
    inferredType: winningType,
  }
}
