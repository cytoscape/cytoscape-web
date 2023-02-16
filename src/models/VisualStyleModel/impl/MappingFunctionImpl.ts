// import chroma from 'chroma-js'
import { scaleLinear } from 'd3-scale'
import { color } from 'd3-color'
import { Table, ValueType, ValueTypeName } from '../../TableModel'
import { SingleValueType } from '../../TableModel/ValueType'
import {
  ContinuousMappingFunction,
  DiscreteMappingFunction,
  MappingFunctionType,
  VisualMappingFunction,
} from '../VisualMappingFunction'
import { VisualPropertyValueTypeName } from '../VisualPropertyValueTypeName'
import { ColorType, VisualPropertyValueType } from '../VisualPropertyValue'

import { SingularElementArgument } from 'cytoscape'
import { IdType } from '../../IdType'
import { CXContinuousMappingFunction } from './cxVisualPropertyConverter'

export type CyJsMappingFunction = (
  mappingFn: VisualMappingFunction,
  table: Table,
  defaultValue: VisualPropertyValueType,
) => (Ele: SingularElementArgument) => VisualPropertyValueType

// only allow non-array values that are defined
const isValidMappingValue = (value: ValueType | undefined): boolean => {
  return value != null && !Array.isArray(value)
}

// a value is valid for continuous mapping if it is a number
const isNumber = (value: ValueType | undefined): boolean => {
  return isValidMappingValue(value) && Number.isFinite(value as number)
}

// check if a given value is a valid hex color
// used to be needed but not currently used.  may be used in the future
// const isHexColor = (vp: VisualPropertyValueType | undefined): boolean => {
//   return vp != null && chroma.valid(vp, 'hex')
// }

// get the value of a column for a given node/edge
// first check if the value is in the row, then check if there is a column default and finally return undefined if neither are defined
const getColumnValue = (
  networkElementId: IdType,
  table: Table,
  attribute: string,
): ValueType | undefined => {
  const row = table.rows.get(networkElementId)
  const column = table.columns.get(attribute)
  return row?.[attribute] ?? column?.defaultValue ?? undefined
}

// precondition: value is in the interval of (min/max)
// create color scale with min/max color values and map the value to a color in that scale
export const mapColor = (
  min: number,
  max: number,
  minVPValue: ColorType,
  maxVPValue: ColorType,
  value: number,
): ColorType => {
  const colorMapper = scaleLinear([min, max], [minVPValue, maxVPValue])

  return (color(colorMapper(value))?.formatHex() ??
    '#ffffff') as unknown as ColorType
}

// precondition: value is in the interval of (min/max)
// map value to a number in the interval of (styleMin/styleMax)
export const mapLinearNumber = (
  value: number,
  min: number,
  max: number,
  styleMin: number,
  styleMax: number,
): number => {
  const numberMapper = scaleLinear([min, max], [styleMin, styleMax])
  return numberMapper(value) ?? 0
}

const createCyJsPassthroughMappingFn: CyJsMappingFunction = (
  mappingFn: VisualMappingFunction,
  table: Table,
  defaultValue: VisualPropertyValueType,
) => {
  const { attribute } = mappingFn
  const cyJsPassthroughMappingFn = (
    ele: SingularElementArgument,
  ): VisualPropertyValueType => {
    const value = getColumnValue(ele.data('id'), table, attribute)

    if (isValidMappingValue(value)) {
      return value as VisualPropertyValueType
    }

    return defaultValue
  }
  return cyJsPassthroughMappingFn
}

const createCyJsDiscreteMappingFn: CyJsMappingFunction = (
  mappingFn: VisualMappingFunction,
  table: Table,
  defaultValue: VisualPropertyValueType,
) => {
  const { attribute, vpValueMap } = mappingFn as DiscreteMappingFunction

  const cyJsDiscreteMappingFn = (
    ele: SingularElementArgument,
  ): VisualPropertyValueType => {
    const value = getColumnValue(ele.data('id'), table, attribute)

    if (isValidMappingValue(value)) {
      return vpValueMap.get(value as ValueType) ?? defaultValue
    }

    return defaultValue
  }

  return cyJsDiscreteMappingFn
}

const createCyJsContinuousMappingFn: CyJsMappingFunction = (
  mappingFn: VisualMappingFunction,
  table: Table,
  defaultValue: VisualPropertyValueType,
) => {
  const { attribute } = mappingFn as ContinuousMappingFunction

  const cyJsContinuousMappingFn = (
    ele: SingularElementArgument,
  ): VisualPropertyValueType => {
    const value = getColumnValue(ele.data('id'), table, attribute) as number

    if (isNumber(value)) {
      // find the first interval that the value is in

      const { min, max, controlPoints } = mappingFn as ContinuousMappingFunction
      const domain = [
        min.value as number,
        ...controlPoints.map((pt) => pt.value),
        max.value as number,
      ]
      const range = [
        min.vpValue as number,
        ...controlPoints.map((pt) => pt.vpValue),
        max.vpValue as number,
      ]
      const scale = scaleLinear(domain as number[], range)
      return scale(value) ?? defaultValue
    }

    // if no interval is found, return the default style value
    return defaultValue
  }

  return cyJsContinuousMappingFn
}

const createDefaultCyJsMappingFn: CyJsMappingFunction = (
  mappingFn: VisualMappingFunction,
  table: Table,
  defaultValue: VisualPropertyValueType,
) => {
  return () => defaultValue
}

export const createCyJsMappingFn: (
  mappingFn: VisualMappingFunction,
  table: Table,
  defaultValue: VisualPropertyValueType,
) => (Ele: SingularElementArgument) => VisualPropertyValueType = (
  mappingFn: VisualMappingFunction,
  table: Table,
  defaultValue: VisualPropertyValueType,
) => {
  switch (mappingFn.type) {
    case 'passthrough': {
      return createCyJsPassthroughMappingFn(mappingFn, table, defaultValue)
    }
    case 'discrete': {
      return createCyJsDiscreteMappingFn(mappingFn, table, defaultValue)
    }
    case 'continuous': {
      return createCyJsContinuousMappingFn(mappingFn, table, defaultValue)
    }
    default:
      return createDefaultCyJsMappingFn(mappingFn, table, defaultValue)
  }
}

const valueType2BaseType: Record<ValueTypeName, SingleValueType | null> = {
  string: 'string',
  long: 'number',
  integer: 'number',
  double: 'number',
  boolean: 'boolean',
  list_of_boolean: null,
  list_of_long: null,
  list_of_double: null,
  list_of_integer: null,
  list_of_string: null,
}

// check whether a given value type can be applied to a given visual property value type
// e.g. number and font size is a valid mapping but number to a string property is not
export const typesCanBeMapped = (
  mappingType: MappingFunctionType,
  valueTypeName: ValueTypeName,
  vpValueTypeName: VisualPropertyValueTypeName,
): boolean => {
  if (mappingType === 'passthrough') {
    const vtBaseType = valueType2BaseType[valueTypeName]
    const isSingleValue = vtBaseType != null
    return (
      valueTypeName === vpValueTypeName ||
      (isSingleValue && vpValueTypeName === 'string') // any single value type can be mapped to a string
    )
  }

  if (mappingType === 'continuous') {
    const vtIsNumber =
      valueTypeName === ValueTypeName.Integer ||
      valueTypeName === 'double' ||
      valueTypeName === 'long'
    const vpIsNumberOrColor =
      vpValueTypeName === 'number' || vpValueTypeName === 'color'

    return vtIsNumber && vpIsNumberOrColor
  }

  return true
}

export const convertContinuousMappingToCx = (
  mapping: ContinuousMappingFunction,
): CXContinuousMappingFunction<VisualPropertyValueType> => {
  const { min, max, controlPoints, attribute } = mapping

  const intervals = []

  for (let i = 0; i < controlPoints.length - 1; i++) {
    const curr = controlPoints[i]
    const next = controlPoints[i + 1]

    if (curr != null && next != null) {
      intervals.push({
        min: curr.value as number,
        max: next.value as number,
        minVPValue: curr.vpValue,
        maxVPValue: next.vpValue,
        includeMin: curr.inclusive ?? true,
        includeMax: next.inclusive ?? true,
      })
    }
  }

  return {
    type: 'CONTINUOUS',
    definition: {
      map: [
        {
          max: min.value as number,
          maxVPValue: min.vpValue,
          includeMax: min.inclusive ?? true,
          includeMin: true, // dummy value, not actually used here
        },
        ...intervals,
        {
          min: max.value as number,
          minVPValue: max.vpValue,
          includeMin: max.inclusive ?? true,
          includeMax: true, // dummy value, not actually used here
        },
      ],
      attribute,
    },
  }
}
