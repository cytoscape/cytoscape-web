import chroma, { Color as ChromaColor } from 'chroma-js'

import { Table, ValueType } from '../../TableModel'
import {
  ContinuousMappingFunction,
  DiscreteMappingFunction,
  VisualMappingFunction,
} from '../VisualMappingFunction'
import { VisualPropertyValueType } from '../VisualPropertyValue'

import { SingularElementArgument } from 'cytoscape'
import { IdType } from '../../IdType'

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
const isHexColor = (vp: VisualPropertyValueType | undefined): boolean => {
  return vp != null && chroma.valid(vp, 'hex')
}

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
const mapColor = (
  min: number,
  max: number,
  minVPValue: ChromaColor,
  maxVPValue: ChromaColor,
  value: number,
): VisualPropertyValueType => {
  const colorMapper = chroma.scale([minVPValue, maxVPValue]).domain([min, max])

  return colorMapper(value).hex() as unknown as VisualPropertyValueType
}

// precondition: value is in the interval of (min/max)
// map value to a number in the interval of (styleMin/styleMax)
const mapLinearNumber = (
  value: number,
  min: number,
  max: number,
  styleMin: number,
  styleMax: number,
): number => {
  const t = (value - min) / (max - min)
  return styleMin + t * (styleMax - styleMin)
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
  const { attribute, intervals } = mappingFn as ContinuousMappingFunction

  const cyJsContinuousMappingFn = (
    ele: SingularElementArgument,
  ): VisualPropertyValueType => {
    const value = getColumnValue(ele.data('id'), table, attribute) as number

    if (isNumber(value)) {
      // find the first interval that the value is in

      for (let i = 0; i < intervals.length; i++) {
        const { min, max, minVPValue, maxVPValue, includeMax, includeMin } =
          intervals[i]

        const minOnly = min != null && max == null
        const maxOnly = max != null && min == null
        const isInterval = max != null && min != null

        if (minOnly) {
          const valueGreaterThanEqual =
            includeMin && min <= value && minVPValue != null
          const valueGreaterThan =
            !includeMin && min < value && minVPValue != null

          if (valueGreaterThan || valueGreaterThanEqual) {
            return minVPValue
          }
        }

        if (maxOnly) {
          const valueLessThanEqual =
            includeMax && max >= value && maxVPValue != null
          const valueLessThan = !includeMax && max > value && maxVPValue != null
          if (valueLessThan || valueLessThanEqual) {
            return maxVPValue
          }
        }

        if (isInterval) {
          const valueInInterval =
            (includeMax && max >= value && includeMin && min <= value) ||
            (!includeMax && max > value && includeMin && min <= value) ||
            (includeMax && max >= value && !includeMin && min < value) ||
            (!includeMax && max > value && !includeMin && min < value)

          if (valueInInterval) {
            // map linear number/color
            const vpsAreColors =
              isHexColor(maxVPValue) && isHexColor(minVPValue)

            const vpsAreNumbers = isNumber(maxVPValue) && isNumber(minVPValue)

            if (vpsAreColors) {
              // map color
              return mapColor(
                min as number,
                max as number,
                minVPValue as unknown as ChromaColor,
                maxVPValue as unknown as ChromaColor,
                value,
              )
            } else {
              if (vpsAreNumbers) {
                return mapLinearNumber(
                  value,
                  min as number,
                  max as number,
                  minVPValue as number,
                  maxVPValue as number,
                ) as unknown as VisualPropertyValueType
              }
            }
          }
        }
      }
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
