import { VisualPropertyName } from '../../../VisualPropertyName'
import { SelectorType } from './SelectorType'

// these exist in cytoscape.js, but are derived from a nested visual property e.g. node label position
export const SpecialPropertyName = {
  NodeLabelHorizontalAlign: 'nodeLabelHorizontalAlign',
  NodeLabelVerticalAlign: 'nodeLabelVerticalAlign',
  NodeLabelMarginX: 'nodeLabelMarginX',
  NodeLabelMarginY: 'nodeLabelMarginY',
  NodeLabelJustification: 'nodeLabelJustification',
  SourceArrowFill: 'sourceEdgeFill',
  TargetArrowFill: 'targetEdgeFill',
} as const

export type SpecialPropertyName =
  (typeof SpecialPropertyName)[keyof typeof SpecialPropertyName]

/**
 * Selector need to be in the format of '<node or edge>[<Common visual property name>]'
 */
export type DirectMappingSelector =
  | `${SelectorType}[${VisualPropertyName}]`
  | `${SelectorType}[${SpecialPropertyName}]`
