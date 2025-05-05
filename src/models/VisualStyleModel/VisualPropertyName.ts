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
  NodeImageChart1: 'nodeImageChart1',
  NodeImageChart2: 'nodeImageChart2',
  NodeImageChart3: 'nodeImageChart3',
  NodeImageChart4: 'nodeImageChart4',
  NodeImageChart5: 'nodeImageChart5',
  NodeImageChart6: 'nodeImageChart6',
  NodeImageChart7: 'nodeImageChart7',
  NodeImageChart8: 'nodeImageChart8',
  NodeImageChart9: 'nodeImageChart9',
  NodeImageChartPosition1: 'nodeImageChartPosition1',
  NodeImageChartPosition2: 'nodeImageChartPosition2',
  NodeImageChartPosition3: 'nodeImageChartPosition3',
  NodeImageChartPosition4: 'nodeImageChartPosition4',
  NodeImageChartPosition5: 'nodeImageChartPosition5',
  NodeImageChartPosition6: 'nodeImageChartPosition6',
  NodeImageChartPosition7: 'nodeImageChartPosition7',
  NodeImageChartPosition8: 'nodeImageChartPosition8',
  NodeImageChartPosition9: 'nodeImageChartPosition9',
  NodeImageChartSize1: 'nodeImageChartSize1',
  NodeImageChartSize2: 'nodeImageChartSize2',
  NodeImageChartSize3: 'nodeImageChartSize3',
  NodeImageChartSize4: 'nodeImageChartSize4',
  NodeImageChartSize5: 'nodeImageChartSize5',
  NodeImageChartSize6: 'nodeImageChartSize6',
  NodeImageChartSize7: 'nodeImageChartSize7',
  NodeImageChartSize8: 'nodeImageChartSize8',
  NodeImageChartSize9: 'nodeImageChartSize9',
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
