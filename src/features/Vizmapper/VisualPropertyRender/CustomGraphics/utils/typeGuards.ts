import {
  PieChartPropertiesType,
  RingChartPropertiesType,
  NonePropertiesType,
} from '../../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'

type AllPropertiesType =
  | PieChartPropertiesType
  | RingChartPropertiesType
  | NonePropertiesType

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

