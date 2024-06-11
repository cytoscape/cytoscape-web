import { ValueTypeName, ValueType } from '../../../../models/TableModel'
import { ColumnAppendState } from '../ColumnAppendState'
import { ColumnAppendType } from '../ColumnAppendType'
import { ColumnAssignmentState } from '../ColumnAssignmentState'
import { ColumnAssignmentType } from '../ColumnAssignmentType'
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
    if (
      !valueMatchesType(value, column.dataType, column.delimiter) &&
      value !== '' &&
      value !== undefined &&
      value !== null
    ) {
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

// ordered list of types
// this is used for tie breakers in the inferred type
// going from most specific to least specific
// elements in the list are ordered by priority from greatest to least
export const typeOrder: ValueTypeName[] = [
  ValueTypeName.Double,
  ValueTypeName.Long,
  ValueTypeName.Integer,
  ValueTypeName.Boolean,
  ValueTypeName.ListLong,
  ValueTypeName.ListInteger,
  ValueTypeName.ListDouble,
  ValueTypeName.ListBoolean,
  ValueTypeName.String,
  ValueTypeName.ListString,
]

// given a list of string values from a column, infer the type of the column
export function inferColumnType(values: string[]): TypeInferenceResult {
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

export function generateInferredColumnAssignment(
  rows: DataTableValue[],
): ColumnAssignmentState[] {
  const inferredColumns: ColumnAssignmentState[] = []
  if (rows.length === 0) {
    return inferredColumns
  }

  const firstRow = rows[0]

  Object.keys(firstRow).forEach((key) => {
    const values = rows.map((row) => row[key])

    const typeInferenceResult = inferColumnType(values)

    let inferredType = typeInferenceResult.inferredType

    if (inferredType !== undefined) {
      inferredColumns.push({
        name: key,
        dataType: inferredType,
        meaning: ColumnAssignmentType.EdgeAttribute,
        invalidValues: [],
      })
    } else {
      inferredColumns.push({
        name: key,
        dataType: ValueTypeName.String,
        meaning: ColumnAssignmentType.EdgeAttribute,
        invalidValues: [],
      })
    }
  })

  return inferredColumns
}

export function generateInferredColumnAppend(
  rows: DataTableValue[],
): ColumnAppendState[] {
  const inferredColumns: ColumnAppendState[] = []
  if (rows.length === 0) {
    return inferredColumns
  }

  const firstRow = rows[0]

  Object.keys(firstRow).forEach((key) => {
    const values = rows.map((row) => row[key])

    const typeInferenceResult = inferColumnType(values)

    let inferredType = typeInferenceResult.inferredType

    inferredColumns.push({
      name: key,
      dataType: inferredType ?? ValueTypeName.String,
      meaning: ColumnAppendType.Attribute,
      invalidValues: [],
      rowsToJoin: [],
    })
  })

  return inferredColumns
}
