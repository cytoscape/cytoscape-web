import { VisualPropertyName } from '../../../VisualPropertyName'
import { SelectorType } from './selectorType'

// these exist in cytoscape.js, but are derived from a nested visual property e.g. node label position
export const SpecialPropertyName = {
  NodeLabelHorizontalAlign: 'nodeLabelHorizontalAlign',
  NodeLabelVerticalAlign: 'nodeLabelVerticalAlign',
  NodeLabelMarginX: 'nodeLabelMarginX',
  NodeLabelMarginY: 'nodeLabelMarginY',
  NodeLabelJustification: 'nodeLabelJustification',
  SourceArrowFill: 'sourceEdgeFill',
  TargetArrowFill: 'targetEdgeFill',
  // Pie chart properties
  PieSize: 'pieSize',
  PieStartAngle: 'pieStartAngle',
  PieHole: 'pieHole',
  Pie1BackgroundColor: 'pie1BackgroundColor',
  Pie2BackgroundColor: 'pie2BackgroundColor',
  Pie3BackgroundColor: 'pie3BackgroundColor',
  Pie4BackgroundColor: 'pie4BackgroundColor',
  Pie5BackgroundColor: 'pie5BackgroundColor',
  Pie6BackgroundColor: 'pie6BackgroundColor',
  Pie7BackgroundColor: 'pie7BackgroundColor',
  Pie8BackgroundColor: 'pie8BackgroundColor',
  Pie9BackgroundColor: 'pie9BackgroundColor',
  Pie10BackgroundColor: 'pie10BackgroundColor',
  Pie11BackgroundColor: 'pie11BackgroundColor',
  Pie12BackgroundColor: 'pie12BackgroundColor',
  Pie13BackgroundColor: 'pie13BackgroundColor',
  Pie14BackgroundColor: 'pie14BackgroundColor',
  Pie15BackgroundColor: 'pie15BackgroundColor',
  Pie16BackgroundColor: 'pie16BackgroundColor',
  Pie1BackgroundSize: 'pie1BackgroundSize',
  Pie2BackgroundSize: 'pie2BackgroundSize',
  Pie3BackgroundSize: 'pie3BackgroundSize',
  Pie4BackgroundSize: 'pie4BackgroundSize',
  Pie5BackgroundSize: 'pie5BackgroundSize',
  Pie6BackgroundSize: 'pie6BackgroundSize',
  Pie7BackgroundSize: 'pie7BackgroundSize',
  Pie8BackgroundSize: 'pie8BackgroundSize',
  Pie9BackgroundSize: 'pie9BackgroundSize',
  Pie10BackgroundSize: 'pie10BackgroundSize',
  Pie11BackgroundSize: 'pie11BackgroundSize',
  Pie12BackgroundSize: 'pie12BackgroundSize',
  Pie13BackgroundSize: 'pie13BackgroundSize',
  Pie14BackgroundSize: 'pie14BackgroundSize',
  Pie15BackgroundSize: 'pie15BackgroundSize',
  Pie16BackgroundSize: 'pie16BackgroundSize',
} as const

export type SpecialPropertyName =
  (typeof SpecialPropertyName)[keyof typeof SpecialPropertyName]

/**
 * Selector need to be in the format of '<node or edge>[<Common visual property name>]'
 */
export type DirectMappingSelector =
  | `${SelectorType}[${VisualPropertyName}]`
  | `${SelectorType}[${SpecialPropertyName}]`
