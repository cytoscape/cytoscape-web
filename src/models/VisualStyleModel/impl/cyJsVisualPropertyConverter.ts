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

  nodeImageChart1: CyVpName.PieSize, // image/chart properties are a special case, these values are placeholders
  nodeImageChart2: CyVpName.PieSize,
  nodeImageChart3: CyVpName.PieSize,
  nodeImageChart4: CyVpName.PieSize,
  nodeImageChart5: CyVpName.PieSize,
  nodeImageChart6: CyVpName.PieSize,
  nodeImageChart7: CyVpName.PieSize,
  nodeImageChart8: CyVpName.PieSize,
  nodeImageChart9: CyVpName.PieSize,
  nodeImageChartPosition1: CyVpName.PieSize, // image/chart properties are a special case, these values are placeholders
  nodeImageChartPosition2: CyVpName.PieSize,
  nodeImageChartPosition3: CyVpName.PieSize,
  nodeImageChartPosition4: CyVpName.PieSize,
  nodeImageChartPosition5: CyVpName.PieSize,
  nodeImageChartPosition6: CyVpName.PieSize,
  nodeImageChartPosition7: CyVpName.PieSize,
  nodeImageChartPosition8: CyVpName.PieSize,
  nodeImageChartPosition9: CyVpName.PieSize,
  nodeImageChartSize1: CyVpName.PieSize, // image/chart properties are a special case, these values are placeholders
  nodeImageChartSize2: CyVpName.PieSize,
  nodeImageChartSize3: CyVpName.PieSize,
  nodeImageChartSize4: CyVpName.PieSize,
  nodeImageChartSize5: CyVpName.PieSize,
  nodeImageChartSize6: CyVpName.PieSize,
  nodeImageChartSize7: CyVpName.PieSize,
  nodeImageChartSize8: CyVpName.PieSize,
  nodeImageChartSize9: CyVpName.PieSize,

  nodeVisibility: CyVpName.Visibility,
  nodeZOrder: CyVpName.NodeZOrder,

  nodeSelectedPaint: CyVpName.BackgroundColor,

  nodeMaxLabelWidth: CyVpName.TextMaxWidth,

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
