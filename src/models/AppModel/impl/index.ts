import { Column, ValueTypeName } from '../../TableModel'
import { InputColumn } from '../ServiceInputDefinition'

export const isList = (vtn: ValueTypeName): boolean => {
  return vtn.includes('list_of')
}

export const isNumber = (vtn: ValueTypeName): boolean => {
  return vtn === 'integer' || vtn === 'double' || vtn === 'long'
}

export const isNumberList = (vtn: ValueTypeName): boolean => {
  return (
    vtn === 'list_of_integer' ||
    vtn === 'list_of_double' ||
    vtn === 'list_of_long'
  )
}

export const inputColumnFilterFn = (
  column: Column,
  inputColumn: InputColumn,
): boolean => {
  switch (inputColumn.dataType) {
    case 'list': {
      return isList(column.type)
    }
    case 'number': {
      return isNumber(column.type)
    }
    case 'wholenumber': {
      return column.type === 'integer'
    }
    case 'list_of_number': {
      return isNumberList(column.type)
    }
    case 'list_of_wholenumber': {
      return column.type === 'list_of_integer'
    }
    default: {
      return column.type === inputColumn.dataType
    }
  }
}
