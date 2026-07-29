import * as d3Scale from 'd3-scale'

import { logUi } from '../../../debug'

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
import {
  CustomGraphicsNameType,
  CustomGraphicsType,
  CustomGraphicsTypeType,
  isSvgImageUrl,
} from '../VisualPropertyValue/CustomGraphicsType'
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

// Build an image custom graphic, picking the raster vs. vector (SVG) factory class
// by URL content so it round-trips to Cytoscape Desktop with the right renderer.
const makeImageGraphics = (url: string): CustomGraphicsType => ({
  type: CustomGraphicsTypeType.Image,
  name: isSvgImageUrl(url)
    ? CustomGraphicsNameType.SVGImage
    : CustomGraphicsNameType.Image,
  properties: { url },
})

const customGraphicPassthroughFn = (
  pm: PassthroughMappingFunction,
  value: VisualPropertyValueType,
): VisualPropertyValueType => {
  if (value == null || value === '') {
    return pm.defaultValue
  }

  const str = String(value).trim()

  // 1. Reject file: and blob: URLs
  if (str.startsWith('blob:')) {
    logUi.warn(
      'Blob URLs are ephemeral and cannot be used for custom graphics:',
      str.substring(0, 80),
    )
    return pm.defaultValue
  }
  if (str.startsWith('file:')) {
    logUi.warn(
      'Local file URLs are not supported for custom graphics:',
      str.substring(0, 80),
    )
    return pm.defaultValue
  }

  // 2. Raw SVG detection → inline data URI
  if (str.startsWith('<svg')) {
    const dataUri = 'data:image/svg+xml,' + encodeURIComponent(str)
    return makeImageGraphics(dataUri)
  }

  // 3. HTTP/HTTPS URL or data: URI → image (raster or vector, chosen by content)
  if (
    str.startsWith('http://') ||
    str.startsWith('https://') ||
    str.startsWith('data:')
  ) {
    return makeImageGraphics(str)
  }

  // 4. JSON chart object
  if (str.startsWith('{')) {
    try {
      const parsed = JSON.parse(str)
      // Distinguish chart types by checking for chart-specific fields
      if (
        Array.isArray(parsed.cy_dataColumns) &&
        Array.isArray(parsed.cy_colors)
      ) {
        const isRing = parsed.cy_holeSize !== undefined
        return {
          type: CustomGraphicsTypeType.Chart,
          name: isRing
            ? CustomGraphicsNameType.RingChart
            : CustomGraphicsNameType.PieChart,
          properties: parsed,
        } as CustomGraphicsType
      }
    } catch {
      // Malformed JSON — fall through to default
    }
  }

  // 5. Unrecognized string — return default silently
  return pm.defaultValue
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
    if (pm.visualPropertyType === VisualPropertyValueTypeName.CustomGraphic) {
      return customGraphicPassthroughFn(pm, value as VisualPropertyValueType)
    }
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

  // The min/max boundary points are interpolation anchors too. Without
  // them, a mapping with fewer than two middle control points had a
  // degenerate d3 domain and returned undefined for every in-range value,
  // and the segment between a boundary and the first control point was
  // flat-clamped instead of interpolated (REVIEW.md R2-20).
  const anchorValues = new Set<number>()
  const anchors: ContinuousFunctionControlPoint[] = [
    { value: minValue, vpValue: min.vpValue },
    ...controlPoints,
    { value: maxValue, vpValue: max.vpValue },
  ]
    .filter((cp) => {
      const value = cp.value as number
      if (anchorValues.has(value)) {
        return false
      }
      anchorValues.add(value)
      return true
    })
    .sort((a, b) => (a.value as number) - (b.value as number))

  const [domain, range] = toRangeAndDomain<T>(anchors)
  const d3Mapper = d3Scale.scaleLinear<T>().domain(domain).range(range)
  d3Mapper.clamp(true)
  const mapper = (attrValue: ValueType): VisualPropertyValueType => {
    // Missing values map to the default: null used to coerce to 0 (hitting
    // ltMinVpValue) and NaN fell through d3 into an undefined VP value
    // (REVIEW.md R2-20)
    if (attrValue == null || typeof attrValue === 'boolean') {
      return defaultValue
    }
    const numericAttrValue =
      typeof attrValue === 'number' ? attrValue : Number(attrValue)
    if (Number.isNaN(numericAttrValue)) {
      return defaultValue
    }

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
    } else if (domain.length < 2) {
      // Degenerate mapping (equal min/max): d3 cannot interpolate a
      // single-point domain
      return range[0] ?? defaultValue
    } else {
      return d3Mapper(numericAttrValue)
    }
  }

  return mapper
}
