import { ListOfValueType, SingleValueType, ValueType } from '../ValueType'
import { ValueTypeName } from '../ValueTypeName'
import { AttributeName } from '../AttributeName'
// serialize lists of different value types into a string to display in the table
// e.g. [1, 2, 3] -> '1, 2, 3'
export const serializeValueList = (value: ListOfValueType): string => {
  return value?.map((v) => String(v)).join(', ') ?? ''
}

export const serializedStringIsValid = (
  valueTypeName: ValueTypeName,
  serializedString: string,
): boolean => {
  if (isListType(valueTypeName)) {
    return serializedString.split(', ').reduce((a, b) => {
      return (
        a &&
        serializedStringIsValid(
          valueTypeName.replace('list_of_', '') as ValueTypeName,
          b,
        )
      )
    }, true)
  } else {
    if (valueTypeName === ValueTypeName.Boolean) {
      return serializedString === 'true' || serializedString === 'false'
    } else if (valueTypeName === ValueTypeName.Double) {
      return !isNaN(+serializedString)
    } else if (valueTypeName === ValueTypeName.Long) {
      return !isNaN(+serializedString)
    } else if (valueTypeName === ValueTypeName.Integer) {
      return !isNaN(+serializedString)
    } else if (valueTypeName === ValueTypeName.String) {
      return true
    }
    return false
  }
}

export const serializeValue = (value: ValueType): string => {
  if (Array.isArray(value)) {
    return serializeValueList(value)
  }
  return String(value)
}
// for a given data type return a default value
export const getDefaultValue = (dataType: ValueTypeName): ValueType => {
  if (dataType.includes('list_of_')) {
    return []
  }

  switch (dataType) {
    case 'boolean':
      return false
    case 'integer':
      return 0
    case 'long':
      return 0
    case 'double':
      return 0.0
    case 'string':
      return ''
    default:
      return ''
  }
}
// deserialize a string into a list of value types
// e.g. '1, 2, 3' -> [1, 2, 3]
export const deserializeValueList = (
  type: ValueTypeName,
  value: string,
): ValueType => {
  const deserializeFnMap: Record<ValueTypeName, (value: string) => ValueType> =
    {
      [ValueTypeName.ListString]: (value: string) =>
        value.split(', ') as ValueType,
      [ValueTypeName.ListLong]: (value: string) =>
        value.split(', ').map((v) => +v) as ValueType,
      [ValueTypeName.ListInteger]: (value: string) =>
        value.split(', ').map((v) => +v) as ValueType,
      [ValueTypeName.ListDouble]: (value: string) =>
        value.split(', ').map((v) => +v) as ValueType,
      [ValueTypeName.ListBoolean]: (value: string) =>
        value.split(', ').map((v) => v === 'true') as ValueType,
      [ValueTypeName.Boolean]: (value: string) => value === 'true',
      [ValueTypeName.String]: (value: string) => value,
      [ValueTypeName.Long]: (value: string) => +value,
      [ValueTypeName.Integer]: (value: string) => +value,
      [ValueTypeName.Double]: (value: string) => +value,
    }

  const v = deserializeFnMap[type](value as string) as ListOfValueType
  return v
}

// deserializeValueList also handles single values
export const deserializeValue = deserializeValueList

// convert list of value type to a string to display in the table
// single value types are supported by the table by default
export const valueDisplay = (
  value: ValueType,
  type: ValueTypeName,
): SingleValueType => {
  if (isSingleType(type) && !Array.isArray(value)) {
    return value
  }

  if (isListType(type)) {
    if (Array.isArray(value)) {
      return serializeValueList(value)
    }
    return value
  }

  return value as SingleValueType
}

export const isSingleType = (type: ValueTypeName): boolean => {
  const singleTypes = [
    ValueTypeName.String,
    ValueTypeName.Integer,
    ValueTypeName.Double,
    ValueTypeName.Long,
    ValueTypeName.Boolean,
  ] as string[]

  return singleTypes.includes(type)
}

export const isListType = (type: ValueTypeName): boolean => {
  const listTypes = [
    ValueTypeName.ListString,
    ValueTypeName.ListInteger,
    ValueTypeName.ListDouble,
    ValueTypeName.ListLong,
    ValueTypeName.ListBoolean,
  ] as string[]

  return listTypes.includes(type)
}

export type SortDirection = 'asc' | 'desc'
export interface SortType {
  column: AttributeName | undefined
  direction: SortDirection | undefined
  valueType: ValueTypeName | undefined
}

export const compareStrings = (
  a: string,
  b: string,
  sortDirection: SortDirection,
): number =>
  sortDirection === 'asc'
    ? (a ?? '').localeCompare(b)
    : (b ?? '').localeCompare(a)

export const compareNumbers = (
  a: number,
  b: number,
  sortDirection: SortDirection,
): number =>
  sortDirection === 'asc'
    ? (a ?? Infinity) - (b ?? -Infinity) // always put undefined values at the bottom of the list
    : (b ?? Infinity) - (a ?? -Infinity)

export const compareBooleans = (
  a: boolean,
  b: boolean,
  sortDirection: SortDirection,
): number => compareStrings(String(a ?? ''), String(b ?? ''), sortDirection)

// TODO come up with better idea of what users want when sorting cells which have list values
export const compareLists = (
  a: ListOfValueType,
  b: ListOfValueType,
  sortDirection: SortDirection,
): number =>
  compareStrings(serializeValueList(a), serializeValueList(b), sortDirection)

export const sortFnToType: Record<
  ValueTypeName,
  (a: ValueType, b: ValueType, sortDirection: SortDirection) => number
> = {
  [ValueTypeName.ListString]: compareLists,
  [ValueTypeName.ListLong]: compareLists,
  [ValueTypeName.ListInteger]: compareLists,
  [ValueTypeName.ListDouble]: compareLists,
  [ValueTypeName.ListBoolean]: compareLists,
  [ValueTypeName.String]: compareStrings,
  [ValueTypeName.Long]: compareNumbers,
  [ValueTypeName.Integer]: compareNumbers,
  [ValueTypeName.Double]: compareNumbers,
  [ValueTypeName.Boolean]: compareBooleans,
}
