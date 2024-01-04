import { ValueTypeName } from '../../../models/TableModel'

export function valueMatchesType(value: string, type: ValueTypeName): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string'
    case 'long':
      return /^[+-]?\d+$/.test(value)
    case 'integer':
      return /^[+-]?\d+$/.test(value)
    case 'double':
      return /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(value)
    case 'boolean':
      return /^true|false$/i.test(value)
    case 'list_of_string':
      return /^\[.*\]$/.test(value)
    case 'list_of_long':
      return (
        /^\[.*\]$/.test(value) &&
        value
          .slice(1, -1)
          .split(',')
          .every((item) => /^[+-]?\d+$/.test(item.trim()))
      )
    case 'list_of_integer':
      return (
        /^\[.*\]$/.test(value) &&
        value
          .slice(1, -1)
          .split(',')
          .every((item) => /^[+-]?\d+$/.test(item.trim()))
      )
    case 'list_of_double':
      return (
        /^\[.*\]$/.test(value) &&
        value
          .slice(1, -1)
          .split(',')
          .every((item) =>
            /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(item.trim()),
          )
      )
    case 'list_of_boolean':
      return (
        /^\[.*\]$/.test(value) &&
        value
          .slice(1, -1)
          .split(',')
          .every((item) => /^true|false$/i.test(item.trim()))
      )
    default:
      return false
  }
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
