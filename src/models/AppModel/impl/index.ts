import safeRegex from 'safe-regex'
import { Column, ValueTypeName } from '../../TableModel'
import { InputColumn } from '../ServiceInputDefinition'
import { ServiceAppParameter } from '../ServiceAppParameter'
import { ParameterUiType } from '../ParameterUiType'

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

const regexCache: Record<string, RegExp> = {}

export const validateParameter = (parameter: ServiceAppParameter): boolean => {
  if (parameter.type === ParameterUiType.Text) {
    const value = parameter.value ?? parameter.defaultValue ?? ''
    const { validationRegex } = parameter

    if (
      validationRegex !== undefined &&
      validationRegex !== null &&
      validationRegex.trim().length > 0
    ) {
      if (validationRegex.length > 1000) {
        return false
      }
      try {
        if (!safeRegex(validationRegex)) {
          // Attempt to compile it. If it fails, it's just invalid syntax, 
          // and we should be lenient (return true).
          // If it succeeds, then it's a valid but unsafe regex (return false).
          new RegExp(validationRegex)
          return false
        }
        let regex = regexCache[validationRegex]
        if (regex === undefined) {
          regex = new RegExp(validationRegex)
          regexCache[validationRegex] = regex
        }
        return regex.test(value)
      } catch (e) {
        return true
      }
    }
  }
  return true
}
