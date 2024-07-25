export const NodeVisualPropertyName = {
  NodeShape: 'nodeShape',
  NodeBorderColor: 'nodeBorderColor',
  NodeBorderLineType: 'nodeBorderLineType',
  NodeBorderWidth: 'nodeBorderWidth',
  NodeBorderOpacity: 'nodeBorderOpacity',
  NodeHeight: 'nodeHeight',
  NodeWidth: 'nodeWidth',
  NodeBackgroundColor: 'nodeBackgroundColor',
  NodeLabel: 'nodeLabel',
  NodeLabelColor: 'nodeLabelColor',
  NodeLabelFontSize: 'nodeLabelFontSize',
  NodeLabelFont: 'nodeLabelFont',
  NodeLabelRotation: 'nodeLabelRotation',
  NodeLabelOpacity: 'nodeLabelOpacity',
  NodeOpacity: 'nodeOpacity',
  NodeVisibility: 'nodeVisibility',
  NodeSelectedPaint: 'nodeSelectedPaint',
  NodeMaxLabelWidth: 'nodeMaxLabelWidth',
  NodeZOrder: 'nodeZOrder',
  NodeLabelPosition: 'nodeLabelPosition',
} as const

export type NodeVisualPropertyName =
  (typeof NodeVisualPropertyName)[keyof typeof NodeVisualPropertyName]

export const EdgeVisualPropertyName = {
  EdgeLineType: 'edgeLineType',
  EdgeLineColor: 'edgeLineColor',
  EdgeWidth: 'edgeWidth',
  EdgeTargetArrowShape: 'edgeTargetArrowShape',
  EdgeTargetArrowColor: 'edgeTargetArrowColor',
  EdgeSourceArrowShape: 'edgeSourceArrowShape',
  EdgeSourceArrowColor: 'edgeSourceArrowColor',
  EdgeLabel: 'edgeLabel',
  EdgeLabelColor: 'edgeLabelColor',
  EdgeLabelFontSize: 'edgeLabelFontSize',
  EdgeLabelFont: 'edgeLabelFont',
  EdgeLabelRotation: 'edgeLabelRotation',
  EdgeLabelOpacity: 'edgeLabelOpacity',
  EdgeOpacity: 'edgeOpacity',
  EdgeVisibility: 'edgeVisibility',
  EdgeSelectedPaint: 'edgeSelectedPaint',
  EdgeMaxLabelWidth: 'edgeMaxLabelWidth',
  EdgeZOrder: 'edgeZOrder',
} as const

export type EdgeVisualPropertyName =
  (typeof EdgeVisualPropertyName)[keyof typeof EdgeVisualPropertyName]

export const NetworkVisualPropertyName = {
  NetworkBackgroundColor: 'networkBackgroundColor',
} as const

export type NetworkVisualPropertyName =
  (typeof NetworkVisualPropertyName)[keyof typeof NetworkVisualPropertyName]

export const VisualPropertyName = {
  ...NodeVisualPropertyName,
  ...EdgeVisualPropertyName,
  ...NetworkVisualPropertyName,
}

export type VisualPropertyName =
  (typeof VisualPropertyName)[keyof typeof VisualPropertyName]