/**
 * Non-fatal visual-style import warnings.
 *
 * Some CX2 visual styles use features Cytoscape Web handles differently from
 * Cytoscape Desktop (e.g. a discrete mapping keyed on a list attribute, or an
 * edge line type Web does not support). Rather than fail or silently diverge,
 * we collect human-readable warnings that callers surface to the user through
 * the message/snackbar mechanism after import.
 */
import { ValueTypeName } from '../../TableModel'
import { MappingFunctionType } from '../VisualMappingFunction/MappingFunctionType'
import { VisualProperty } from '../VisualProperty'
import { VisualPropertyName } from '../VisualPropertyName'
import { VisualPropertyValueType } from '../VisualPropertyValue'
import { VisualStyle } from '../VisualStyle'

export interface VisualStyleWarning {
  code: string
  message: string
}

const LIST_VALUE_TYPES: Set<ValueTypeName> = new Set([
  ValueTypeName.ListString,
  ValueTypeName.ListLong,
  ValueTypeName.ListInteger,
  ValueTypeName.ListDouble,
  ValueTypeName.ListBoolean,
])

const isListAttributeType = (attributeType?: ValueTypeName): boolean =>
  attributeType !== undefined && LIST_VALUE_TYPES.has(attributeType)

/**
 * Detect discrete mappings that are keyed on a list attribute.
 *
 * Cytoscape Web keys a discrete mapping off the first element of the list (to
 * match Cytoscape Desktop). This is worth surfacing because only the first
 * element participates in the mapping.
 */
const collectListAttributeDiscreteMappingWarnings = (
  vs: VisualStyle,
): VisualStyleWarning[] => {
  const affected: string[] = []
  const vpNames = Object.keys(vs) as VisualPropertyName[]
  vpNames.forEach((vpName) => {
    const vp: VisualProperty<VisualPropertyValueType> = vs[vpName]
    const mapping = vp.mapping
    if (
      mapping !== undefined &&
      mapping.type === MappingFunctionType.Discrete &&
      isListAttributeType(mapping.attributeType)
    ) {
      affected.push(`${vp.displayName} (attribute "${mapping.attribute}")`)
    }
  })

  if (affected.length === 0) {
    return []
  }

  return [
    {
      code: 'discrete-mapping-list-attribute',
      message:
        `Discrete mapping on a list attribute detected: ${affected.join(
          ', ',
        )}. ` +
        'Cytoscape Web uses the first element of the list for the mapping, ' +
        'matching Cytoscape Desktop.',
    },
  ]
}

/**
 * Collect all non-fatal visual-style warnings for a converted visual style.
 */
export const collectVisualStyleWarnings = (
  vs: VisualStyle,
): VisualStyleWarning[] => {
  return [...collectListAttributeDiscreteMappingWarnings(vs)]
}
