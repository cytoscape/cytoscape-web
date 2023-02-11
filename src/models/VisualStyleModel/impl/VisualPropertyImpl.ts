import { IdType } from '../../IdType'
import { VisualProperty } from '../VisualProperty'
import { VisualPropertyValueType } from '../VisualPropertyValue'

/**
 * Compute a vp value from a given attribute value
 *
 * @param vp
 * @param value
 */
export const applyVisualProperty = (
  id: IdType,
  vp: VisualProperty<VisualPropertyValueType>,
): VisualPropertyValueType => {
  const { mapping, bypassMap, defaultValue } = vp

  // 1. If bypass is available, use it as-is
  if (bypassMap.has(id)) {
    const bypassValue = bypassMap.get(id)
    if (bypassValue !== undefined) {
      return bypassValue
    }
  } else if (mapping !== undefined) {
    // TODO: Implement mapping
    return defaultValue
  }

  // Otherwise, use default as-is
  return defaultValue
}
