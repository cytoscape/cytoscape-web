import chroma, { Color } from 'chroma-js'

import { Table } from '../../TableModel'
import {
  ContinuousMappingFunction,
  DiscreteMappingFunction,
  VisualMappingFunction,
} from '../VisualMappingFunction'
import { VisualPropertyValueType } from '../VisualPropertyValue'

import { SingularElementArgument } from 'cytoscape'

export type CyJsMappingFunction = (
  mappingFn: VisualMappingFunction<VisualPropertyValueType>,
  table: Table,
  defaultValue: VisualPropertyValueType,
) => (Ele: SingularElementArgument) => VisualPropertyValueType

const createCyJsPassthroughMappingFn: CyJsMappingFunction = (
  mappingFn: VisualMappingFunction<VisualPropertyValueType>,
  table: Table,
  defaultValue: VisualPropertyValueType,
) => {
  const { attribute } = mappingFn
  return (ele: SingularElementArgument): VisualPropertyValueType => {
    const row = table.rows.get(ele.data('id'))
    const column = table.columns.get(attribute)
    const value = row?.[attribute] ?? column?.defaultValue

    if (!Array.isArray(value) && value != null) {
      return value
    }

    return defaultValue
  }
}

const createCyJsDiscreteMappingFn: CyJsMappingFunction = (
  mappingFn: VisualMappingFunction<VisualPropertyValueType>,
  table: Table,
  defaultValue: VisualPropertyValueType,
) => {
  const { attribute, vpValueMap } = mappingFn as DiscreteMappingFunction

  return (ele: SingularElementArgument): VisualPropertyValueType => {
    const row = table.rows.get(ele.data('id'))
    const column = table.columns.get(attribute)
    const value = row?.[attribute] ?? column?.defaultValue

    if (!Array.isArray(value) && value != null) {
      return vpValueMap.get(value) ?? defaultValue
    }

    return defaultValue
  }
}

const createCyJsContinuousMappingFn: CyJsMappingFunction = (
  mappingFn: VisualMappingFunction<VisualPropertyValueType>,
  table: Table,
  defaultValue: VisualPropertyValueType,
) => {
  const { attribute, intervals } = mappingFn as ContinuousMappingFunction

  return (ele: SingularElementArgument): VisualPropertyValueType => {
    const row = table.rows.get(ele.data('id'))
    const column = table.columns.get(attribute)
    const value = row?.[attribute] ?? column?.defaultValue

    if (!Array.isArray(value) && value != null && Number.isFinite(value)) {
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
              maxVPValue != null &&
              minVPValue != null &&
              chroma.valid(maxVPValue, 'hex') &&
              chroma.valid(minVPValue, 'hex')

            const vpsAreNumbers =
              maxVPValue != null &&
              minVPValue != null &&
              Number.isFinite(maxVPValue) &&
              Number.isFinite(minVPValue)

            if (vpsAreColors) {
              // map color
              const colorMapper = chroma
                .scale([
                  minVPValue as unknown as Color,
                  maxVPValue as unknown as Color,
                ])
                .domain([min as unknown as number, max as unknown as number])
              return colorMapper(
                value as unknown as number,
              ).hex() as unknown as VisualPropertyValueType
            }

            if (vpsAreNumbers) {
              // map number
              // export const mapLinearNumber = (
              //   value: number,
              //   min: number,
              //   max: number,
              //   styleMin: number,
              //   styleMax: number,
              // ): number => {
              //   const t = (value - min) / (max - min)
              //   return styleMin + t * (styleMax - styleMin)
              // }
              // map linear numbers
              const v = value as number
              const minV = min as number
              const maxV = max as number
              const minVP = minVPValue as number
              const maxVP = maxVPValue as number
              const t = (v - minV) / (maxV - minV)
              return minVP + t * (maxVP - minVP)
            }
          }
        }
      }
    }

    return defaultValue
  }
}

const createDefaultCyJsMappingFn: CyJsMappingFunction = (
  mappingFn: VisualMappingFunction<VisualPropertyValueType>,
  table: Table,
  defaultValue: VisualPropertyValueType,
) => {
  return () => defaultValue
}

export const createCyJsMappingFn: (
  mappingFn: VisualMappingFunction<VisualPropertyValueType>,
  table: Table,
  defaultValue: VisualPropertyValueType,
) => (Ele: SingularElementArgument) => VisualPropertyValueType = (
  mappingFn: VisualMappingFunction<VisualPropertyValueType>,
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
