import {
  ImagePropertiesType,
  NonePropertiesType,
  PieChartPropertiesType,
  RingChartPropertiesType,
} from '../../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'

type AllPropertiesType =
  | PieChartPropertiesType
  | RingChartPropertiesType
  | NonePropertiesType
  | ImagePropertiesType

/**
 * Type guard to check if properties are for a pie chart
 */
export function isPieChartProperties(
  props: AllPropertiesType,
): props is PieChartPropertiesType {
  return 'cy_dataColumns' in props && !('cy_holeSize' in props)
}

/**
 * Type guard to check if properties are for a ring chart
 */
export function isRingChartProperties(
  props: AllPropertiesType,
): props is RingChartPropertiesType {
  return 'cy_dataColumns' in props && 'cy_holeSize' in props
}

/**
 * Type guard to check if properties are for an image
 */
export function isImageProperties(
  props: AllPropertiesType,
): props is ImagePropertiesType {
  return 'url' in props
}
