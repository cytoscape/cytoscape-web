import * as d3Scale from 'd3-scale'

import { ValueType } from '../../TableModel'
import { VisibilityType } from '../../VisualStyleModel/VisualPropertyValue/VisibilityType'
import {
  ContinuousFunctionControlPoint,
  ContinuousMappingFunction,
} from '../VisualMappingFunction/ContinuousMappingFunction'
import { DiscreteMappingFunction } from '../VisualMappingFunction/DiscreteMappingFunction'
import { Mapper } from '../VisualMappingFunction/Mapper'
import { PassthroughMappingFunction } from '../VisualMappingFunction/PassthroughMappingFunction'
import { ColorType, VisualPropertyValueType } from '../VisualPropertyValue'
// import * as d3Color from 'd3-color'
import { VisualPropertyValueTypeName } from '../VisualPropertyValueTypeName'
import { normalizeEnumValue } from './enumValueNormalization'

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
  // CW-517: reconcile Desktop-authored shape / line-type values (e.g.
  // "Diamond", "DASHED") with Cytoscape Web's canonical enum values so that
  // passthrough mappings created in Desktop actually take effect.
  return normalizeEnumValue(pm.visualPropertyType, value)
}
/**
 * Derive the mapping function from given VMF object
 */
export const createDiscreteMapper = (dm: DiscreteMappingFunction): Mapper => {
  return (value: ValueType): VisualPropertyValueType => {
    // Discrete mappings look up a single scalar key. When the attribute is a
    // list (e.g. list_of_string), the whole array can never match a Map key,
    // which is why every element falls back to the default value. Cytoscape
    // Desktop keys off the first element of the list, so mirror that behavior.
    const lookupKey: ValueType =
      Array.isArray(value) && value.length > 0 ? value[0] : value
    const vpValue = dm.vpValueMap.get(lookupKey)
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
  if (cm.visualPropertyType === VisualPropertyValueTypeName.Color) {
    return (value: ValueType) => getMapper<ColorType>(cm)(value)
  }
  if (cm.visualPropertyType === VisualPropertyValueTypeName.Number) {
    return (value: ValueType) => getMapper<number>(cm)(value)
  }
  // CW-569: discrete-valued visual properties (e.g. edge line type, node shape)
  // cannot be interpolated, so map the numeric attribute value through a step
  // function over the control points instead of returning the default value.
  return createSteppedMapper(cm)
}

/**
 * Build a step-function mapper for a continuous mapping whose visual-property
 * value is discrete (not numeric or color). The numeric attribute value selects
 * the value of the last control point whose threshold it has reached; values
 * below the minimum / above the maximum use the mapping's lt/gt values.
 */
export const createSteppedMapper = (cm: ContinuousMappingFunction): Mapper => {
  const points = [
    { value: cm.min?.value, vpValue: cm.min?.vpValue },
    ...cm.controlPoints,
    { value: cm.max?.value, vpValue: cm.max?.vpValue },
  ]
    .filter((p) => typeof p.value === 'number')
    .sort((a, b) => (a.value as number) - (b.value as number))

  return (value: ValueType): VisualPropertyValueType => {
    if (points.length === 0 || typeof value !== 'number') {
      return cm.defaultValue
    }

    const first = points[0]
    const last = points[points.length - 1]

    if (value < (first.value as number)) {
      return (cm.ltMinVpValue ?? first.vpValue) as VisualPropertyValueType
    }
    if (value > (last.value as number)) {
      return (cm.gtMaxVpValue ?? last.vpValue) as VisualPropertyValueType
    }

    let result = first.vpValue
    for (const p of points) {
      if (value >= (p.value as number)) {
        result = p.vpValue
      } else {
        break
      }
    }
    return result as VisualPropertyValueType
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
export const getMapper = <T extends VisualPropertyValueType>(
  cm: ContinuousMappingFunction,
): Mapper => {
  const { min, max, controlPoints, defaultValue, ltMinVpValue, gtMaxVpValue } =
    cm
  const minValue = min.value as number
  const maxValue = max.value as number
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
        return gtMaxVpValue ?? max.vpValue
      } else if (isLessThanMin) {
        return ltMinVpValue ?? min.vpValue
      } else {
        return d3Mapper(numericAttrValue)
      }
    }
    return defaultValue
  }

  return mapper
}
