import { ValueType } from '../../TableModel'
import { ColorType, VisualPropertyValueType } from '../VisualPropertyValue'
import {
  ContinuousFunctionControlPoint,
  ContinuousMappingFunction,
} from './ContinuousMappingFunction'
import { DiscreteMappingFunction } from './DiscreteMappingFunction'
import { Mapper } from './Mapper'
import { PassthroughMappingFunction } from './PassthroughMappingFunction'

import * as d3Scale from 'd3-scale'
// import * as d3Color from 'd3-color'
import { VisualPropertyValueTypeName } from '../VisualPropertyValueTypeName'

/**
 * Derive the mapping function from given VMF object
 */
export const createDiscreteMapper = (dm: DiscreteMappingFunction): Mapper => {
  return (value: ValueType): VisualPropertyValueType => {
    const vpValue = dm.vpValueMap.get(value)
    return vpValue === undefined ? dm.defaultValue : vpValue
  }
}

export const createPassthroughMapper = (
  pm: PassthroughMappingFunction,
): Mapper => {
  return (value: ValueType): VisualPropertyValueType => {
    return (value as VisualPropertyValueType) ?? pm.defaultValue
  }
}

export const createContinuousMapper = (
  cm: ContinuousMappingFunction,
): Mapper => {
  return (value: ValueType): VisualPropertyValueType => {
    // TODO: Implement this
    if (cm.visualPropertyType === VisualPropertyValueTypeName.Color) {
      return getMapper<ColorType>(cm)(value)
    } else if (cm.visualPropertyType === VisualPropertyValueTypeName.Number) {
      return getMapper<number>(cm)(value)
    }
    return cm.defaultValue
  }
}

const toRangeAndDomain = <T extends VisualPropertyValueType>(
  controlPoints: ContinuousFunctionControlPoint[],
): [domain: number[], range: T[]] => {
  const domain: number[] = []
  const range: T[] = []
  controlPoints.forEach((cp: ContinuousFunctionControlPoint) => {
    const { value } = cp
    const vpVal = cp.vpValue as T
    domain.push(value as number)
    range.push(vpVal)
  })

  return [domain, range]
}

const getMapper = <T extends VisualPropertyValueType>(
  cm: ContinuousMappingFunction,
): Mapper => {
  const { controlPoints, defaultValue } = cm
  const [domain, range] = toRangeAndDomain<T>(controlPoints)
  const d3Mapper = d3Scale.scaleLinear<T>().domain(domain).range(range)
  const mapper = (attrValue: ValueType): VisualPropertyValueType => {
    if (attrValue !== undefined) {
      return d3Mapper(attrValue as number)
    }
    return defaultValue
  }

  return mapper
}

// const getColorMapper = (cm: ContinuousMappingFunction): Mapper => {
//   const { controlPoints, defaultValue } = cm
//   const [domain, range] = toRangeAndDomain<ColorType>(controlPoints)
//   const colorMapper = d3Scale.scaleLinear<string>().domain(domain).range(range)
//   const mapper = (attrValue: ValueType): VisualPropertyValueType => {
//     if (attrValue !== undefined) {
//       return colorMapper(attrValue as number) as ColorType
//     }
//     return defaultValue
//   }

//   return mapper
// }
