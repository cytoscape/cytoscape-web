export type NodeVisualPropertyName =
  | 'nodeShape'
  | 'nodeBorderColor'
  | 'nodeBorderLineType'
  | 'nodeBorderWidth'
  | 'nodeBorderOpacity'
  | 'nodeHeight'
  | 'nodeWidth'
  | 'nodeBackgroundColor'
  | 'nodeLabel'
  | 'nodeLabelColor'
  | 'nodeLabelFontSize'
  | 'nodeLabelFont'
  | 'nodeLabelVerticalAlign'
  | 'nodeLabelHorizontalAlign'
  | 'nodeLabelRotation'
  | 'nodeLabelOpacity'
  | 'nodePositionX'
  | 'nodePositionY'
  | 'nodePositionZ'
  | 'nodeOpacity'
  | 'nodeVisibility'

export type EdgeVisualPropertyName =
  | 'edgeLineType'
  | 'edgeLineColor'
  | 'edgeWidth'
  | 'edgeTargetArrowShape'
  | 'edgeTargetArrowColor'
  | 'edgeSourceArrowShape'
  | 'edgeSourceArrowColor'
  | 'edgeLabel'
  | 'edgeLabelColor'
  | 'edgeLabelFontSize'
  | 'edgeLabelFont'
  | 'edgeLabelRotation'
  | 'edgeLabelAutoRotation'
  | 'edgeLabelOpacity'
  | 'edgeOpacity'
  | 'edgeVisibility'

export type NetworkVisualPropertyName = 'networkBackgroundColor'

export type VisualPropertyName =
  | NodeVisualPropertyName
  | EdgeVisualPropertyName
  | NetworkVisualPropertyName
