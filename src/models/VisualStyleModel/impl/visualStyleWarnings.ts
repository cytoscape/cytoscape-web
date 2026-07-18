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
import { ContinuousMappingFunction } from '../VisualMappingFunction/ContinuousMappingFunction'
import { DiscreteMappingFunction } from '../VisualMappingFunction/DiscreteMappingFunction'
import { MappingFunctionType } from '../VisualMappingFunction/MappingFunctionType'
import { VisualProperty } from '../VisualProperty'
import { VisualPropertyName } from '../VisualPropertyName'
import { VisualPropertyValueType } from '../VisualPropertyValue'
import { EdgeLineType } from '../VisualPropertyValue/EdgeLineType'
import { NodeBorderLineType } from '../VisualPropertyValue/NodeBorderLineType'
import { VisualPropertyValueTypeName } from '../VisualPropertyValueTypeName'
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

const SUPPORTED_EDGE_LINE_TYPES: Set<string> = new Set(
  Object.values(EdgeLineType),
)
const SUPPORTED_NODE_BORDER_LINE_TYPES: Set<string> = new Set(
  Object.values(NodeBorderLineType),
)

const supportedLineTypesFor = (
  vpType: VisualPropertyValueTypeName,
): Set<string> | null => {
  if (vpType === VisualPropertyValueTypeName.EdgeLine) {
    return SUPPORTED_EDGE_LINE_TYPES
  }
  if (vpType === VisualPropertyValueTypeName.NodeBorderLine) {
    return SUPPORTED_NODE_BORDER_LINE_TYPES
  }
  return null
}

/**
 * Gather every concrete visual-property value a line-type property can take on:
 * its default, discrete/continuous mapping outputs, and per-element bypasses.
 */
const collectLineTypeValues = (
  vp: VisualProperty<VisualPropertyValueType>,
): VisualPropertyValueType[] => {
  const values: VisualPropertyValueType[] = [vp.defaultValue]

  const mapping = vp.mapping
  if (mapping !== undefined) {
    if (mapping.type === MappingFunctionType.Discrete) {
      const dm = mapping as DiscreteMappingFunction
      dm.vpValueMap.forEach((v) => values.push(v))
    } else if (mapping.type === MappingFunctionType.Continuous) {
      const cm = mapping as ContinuousMappingFunction
      values.push(cm.min.vpValue, cm.max.vpValue)
      cm.controlPoints.forEach((cp) => values.push(cp.vpValue))
    }
  }

  vp.bypassMap.forEach((v) => values.push(v))

  return values
}

/**
 * CW-505: detect edge line / node border line values Cytoscape Web does not
 * support. The renderer falls back to a solid line for these, which is silent
 * and confusing, so we surface a warning naming the unsupported values.
 */
const collectUnsupportedLineTypeWarnings = (
  vs: VisualStyle,
): VisualStyleWarning[] => {
  const unsupported = new Set<string>()
  const vpNames = Object.keys(vs) as VisualPropertyName[]
  vpNames.forEach((vpName) => {
    const vp: VisualProperty<VisualPropertyValueType> = vs[vpName]
    const supported = supportedLineTypesFor(vp.type)
    if (supported === null) {
      return
    }
    collectLineTypeValues(vp).forEach((value) => {
      if (typeof value === 'string' && !supported.has(value)) {
        unsupported.add(value)
      }
    })
  })

  if (unsupported.size === 0) {
    return []
  }

  return [
    {
      code: 'unsupported-line-type',
      message:
        `Unsupported line type(s): ${Array.from(unsupported).join(', ')}. ` +
        'Cytoscape Web supports solid, dotted and dashed lines (plus double ' +
        'for node borders) and will render unsupported types as a solid line.',
    },
  ]
}

/**
 * Collect all non-fatal visual-style warnings for a converted visual style.
 */
export const collectVisualStyleWarnings = (
  vs: VisualStyle,
): VisualStyleWarning[] => {
  return [
    ...collectListAttributeDiscreteMappingWarnings(vs),
    ...collectUnsupportedLineTypeWarnings(vs),
  ]
}
