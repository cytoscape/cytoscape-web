import { VisualPropertyName } from '..'

import {
  CyjsVisualPropertyType,
  CyjsVisualPropertyName as CyVpName,
} from './CyjsProperties/CyjsVisualPropertyName'

const VpName2CyjsVpName: Record<VisualPropertyName, CyjsVisualPropertyType> = {
  nodeShape: CyVpName.Shape,
  nodeHeight: CyVpName.Height,
  nodeWidth: CyVpName.Width,
  nodeBackgroundColor: CyVpName.BackgroundColor,
  nodeOpacity: CyVpName.Opacity,

  nodeBorderColor: CyVpName.BorderColor,
  nodeBorderLineType: CyVpName.BorderLineType,
  nodeBorderWidth: CyVpName.BorderWidth,
  nodeBorderOpacity: CyVpName.BorderOpacity,

  nodeLabel: CyVpName.Label,
  nodeLabelColor: CyVpName.LabelColor,
  nodeLabelFontSize: CyVpName.LabelFontSize,
  nodeLabelFont: CyVpName.LabelFont,
  nodeLabelPosition: CyVpName.LabelVerticalAlign, // label position is a special case, and it produces two cyjs visual properties.  This value is a placeholder
  nodeLabelRotation: CyVpName.LabelRotation,
  nodeLabelOpacity: CyVpName.LabelOpacity,

  nodeVisibility: CyVpName.Visibility,
  nodeZOrder: CyVpName.NodeZOrder,

  nodeSelectedPaint: CyVpName.BackgroundColor,

  nodeMaxLabelWidth: CyVpName.TextMaxWidth,

  pieSize: CyVpName.PieSize,
  pie1BackgroundColor: CyVpName.Pie1BackgroundColor,
  pie1BackgroundSize: CyVpName.Pie1BackgroundSize,
  pie1BackgroundOpacity: CyVpName.Pie1BackgroundOpacity,
  pie2BackgroundColor: CyVpName.Pie2BackgroundColor,
  pie2BackgroundSize: CyVpName.Pie2BackgroundSize,
  pie2BackgroundOpacity: CyVpName.Pie2BackgroundOpacity,
  pie3BackgroundColor: CyVpName.Pie3BackgroundColor,
  pie3BackgroundSize: CyVpName.Pie3BackgroundSize,
  pie3BackgroundOpacity: CyVpName.Pie3BackgroundOpacity,

  edgeLineType: CyVpName.LineStyle,
  edgeLineColor: CyVpName.LineColor,
  edgeWidth: CyVpName.Width,
  edgeTargetArrowShape: CyVpName.TargetArrowShape,
  edgeSourceArrowShape: CyVpName.SourceArrowShape,
  edgeTargetArrowColor: CyVpName.TargetArrowColor,
  edgeSourceArrowColor: CyVpName.SourceArrowColor,
  edgeLabel: CyVpName.Label,
  edgeLabelColor: CyVpName.LabelColor,
  edgeLabelFontSize: CyVpName.LabelFontSize,
  edgeLabelFont: CyVpName.LabelFont,
  edgeLabelRotation: CyVpName.LabelRotation,
  edgeLabelOpacity: CyVpName.LabelOpacity,
  edgeOpacity: CyVpName.LineOpacity,
  edgeVisibility: CyVpName.Visibility,

  edgeSelectedPaint: CyVpName.LineColor,
  edgeMaxLabelWidth: CyVpName.TextMaxWidth,

  edgeZOrder: CyVpName.EdgeZOrder,

  networkBackgroundColor: CyVpName.BackgroundColor,
} as const

/**
 * The mapping function from static map of visual property name
 * to cyjs visual property name
 *
 * @param vpName
 * @returns
 */
export const getCyjsVpName = (
  vpName: VisualPropertyName,
): CyjsVisualPropertyType => {
  return VpName2CyjsVpName[vpName]
}
