import { Row } from '../../TableModel'
import { VisualProperty } from '../VisualProperty'
import { VisualPropertyValueType } from '../VisualPropertyValue'

/**
 * Compute a vp value from a given attribute value
 *
 * @param vp
 * @param value
 */
export const applyVisualProperty = (
  vp: VisualProperty<VisualPropertyValueType>,
  row: Row,
): VisualPropertyValueType => {
  const { mapping, bypassMap, defaultValue } = vp

  const { id } = row

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
