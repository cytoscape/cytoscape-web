import {
  EdgeVisualPropertyName,
  NodeVisualPropertyName,
} from '../VisualPropertyName'
import { VisibilityType } from '../VisualPropertyValue/VisibilityType'
import { VisualStyle } from '../VisualStyle'

/**
 * Whether a visibility bypass of the style hides a node or an edge: what
 * "Show All" can show again. Elements a mapping or the default hides are
 * not counted, since removing bypasses does not show them.
 */
export const hasHiddenElements = (visualStyle: VisualStyle): boolean =>
  [
    NodeVisualPropertyName.NodeVisibility,
    EdgeVisualPropertyName.EdgeVisibility,
  ].some((vpName) => {
    const bypassMap = visualStyle[vpName]?.bypassMap
    if (bypassMap === undefined) return false
    for (const value of bypassMap.values()) {
      if (value === VisibilityType.None) return true
    }
    return false
  })
