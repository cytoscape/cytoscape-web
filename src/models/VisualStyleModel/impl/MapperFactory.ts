import { ValueType } from '../../TableModel'
import { ColorType, VisualPropertyValueType } from '../VisualPropertyValue'
import { VisibilityType } from '../../VisualStyleModel/VisualPropertyValue/VisibilityType'
import {
  ContinuousFunctionControlPoint,
  ContinuousMappingFunction,
} from '../VisualMappingFunction/ContinuousMappingFunction'
import { DiscreteMappingFunction } from '../VisualMappingFunction/DiscreteMappingFunction'
import { Mapper } from '../VisualMappingFunction/Mapper'
import { PassthroughMappingFunction } from '../VisualMappingFunction/PassthroughMappingFunction'

import * as d3Scale from 'd3-scale'
// import * as d3Color from 'd3-color'
import { VisualPropertyValueTypeName } from '../VisualPropertyValueTypeName'

const enumTypes: Set<VisualPropertyValueTypeName> = new Set([
  VisualPropertyValueTypeName.NodeShape,
  VisualPropertyValueTypeName.EdgeLine,
  VisualPropertyValueTypeName.EdgeArrowShape,
  VisualPropertyValueTypeName.Font,
  VisualPropertyValueTypeName.HorizontalAlign,
  VisualPropertyValueTypeName.VerticalAlign,
  VisualPropertyValueTypeName.NodeBorderLine,
  VisualPropertyValueTypeName.Visibility,
])

// all enum value strings are in lower case
const enumValueNormalizationFn = (
  pm: PassthroughMappingFunction,
  value: VisualPropertyValueType,
): VisualPropertyValueType => {
  if (pm.visualPropertyType === VisualPropertyValueTypeName.Visibility) {
    if (typeof value === 'string') {
      const normalizedValue = value.toLowerCase()
      if (normalizedValue === 'true' || normalizedValue === 'false') {
        return normalizedValue === 'true'
          ? VisibilityType.Element
          : VisibilityType.None
      }
    }
    if (typeof value === 'boolean') {
      return value === true ? VisibilityType.Element : VisibilityType.None
    }
  }
  return value
}
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
    if (enumTypes.has(pm.visualPropertyType)) {
      return enumValueNormalizationFn(pm, value as VisualPropertyValueType)
    } else {
      return (value as VisualPropertyValueType) ?? pm.defaultValue
    }
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
  const { min, max, controlPoints, defaultValue } = cm
  const minValue = min.value as number
  const maxValue = max.value as number
  const minVpValue = min.vpValue as T
  const maxVpValue = max.vpValue as T
  const [domain, range] = toRangeAndDomain<T>(controlPoints)
  const d3Mapper = d3Scale.scaleLinear<T>().domain(domain).range(range)
  d3Mapper.clamp(true)
  const mapper = (attrValue: ValueType): VisualPropertyValueType => {
    if (attrValue !== undefined) {
      const numericAttrValue = attrValue as number
      const isLessThanMin =
        (min.inclusive ?? false)
          ? numericAttrValue <= minValue
          : numericAttrValue < minValue
      const isGreaterThanMax =
        (max.inclusive ?? false)
          ? numericAttrValue >= maxValue
          : numericAttrValue > maxValue
      if (isGreaterThanMax) {
        return maxVpValue
      } else if (isLessThanMin) {
        return minVpValue
      } else {
        return d3Mapper(numericAttrValue)
      }
    }
    return defaultValue
  }

  return mapper
}
