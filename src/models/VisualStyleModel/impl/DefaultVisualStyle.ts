import { NodeLabelPositionType } from '../VisualPropertyValue'
import { VisualStyle } from '../VisualStyle'

export const DEFAULT_NODE_LABEL_POSITION: NodeLabelPositionType = {
  HORIZONTAL_ALIGN: 'center',
  VERTICAL_ALIGN: 'center',
  HORIZONTAL_ANCHOR: 'center',
  VERTICAL_ANCHOR: 'center',
  JUSTIFICATION: 'center',
  MARGIN_X: 0,
  MARGIN_Y: 0,
}
export const getDefaultVisualStyle = (): VisualStyle => ({
  nodeShape: {
    group: 'node',
    name: 'nodeShape',
    type: 'nodeShape',
    displayName: 'Shape',
    defaultValue: 'ellipse',
    bypassMap: new Map(),
  },
  nodeBorderColor: {
    group: 'node',
    name: 'nodeBorderColor',
    displayName: 'Border Color',
    type: 'color',
    defaultValue: '#000000',
    bypassMap: new Map(),
  },
  nodeBorderLineType: {
    group: 'node',
    name: 'nodeBorderLineType',
    displayName: 'Border Line Type',
    type: 'nodeBorderLine',
    defaultValue: 'solid',
    bypassMap: new Map(),
  },
  nodeBorderWidth: {
    group: 'node',
    name: 'nodeBorderWidth',
    displayName: 'Border Width',
    type: 'number',
    defaultValue: 1,
    bypassMap: new Map(),
  },
  nodeBorderOpacity: {
    group: 'node',
    name: 'nodeBorderOpacity',
    displayName: 'Border Opacity',
    type: 'number',
    defaultValue: 1.0,
    bypassMap: new Map(),
    maxVal: 1,
    tooltip: 'The transparency of the node border. 100% is fully opaque, 0% is fully transparent.', 
  },
  nodeHeight: {
    group: 'node',
    name: 'nodeHeight',
    displayName: 'Height',
    type: 'number',
    defaultValue: 40,
    bypassMap: new Map(),
  },
  nodeWidth: {
    group: 'node',
    name: 'nodeWidth',
    displayName: 'Width',
    type: 'number',
    defaultValue: 40,
    bypassMap: new Map(),
  },
  nodeBackgroundColor: {
    group: 'node',
    name: 'nodeBackgroundColor',
    displayName: 'Fill Color',
    type: 'color',
    defaultValue: '#FFFFFF',
    bypassMap: new Map(),
  },
  nodeLabel: {
    group: 'node',
    name: 'nodeLabel',
    displayName: 'Label',
    type: 'string',
    defaultValue: '',
    bypassMap: new Map(),
  },
  nodeLabelColor: {
    group: 'node',
    name: 'nodeLabelColor',
    displayName: 'Label Color',
    type: 'color',
    defaultValue: '#000000',
    bypassMap: new Map(),
  },
  nodeLabelFontSize: {
    group: 'node',
    name: 'nodeLabelFontSize',
    displayName: 'Label Font Size',
    type: 'number',
    defaultValue: 12,
    bypassMap: new Map(),
  },
  nodeLabelFont: {
    group: 'node',
    name: 'nodeLabelFont',
    displayName: 'Label Font',
    type: 'font',
    defaultValue: 'serif',
    bypassMap: new Map(),
  },
  nodeLabelRotation: {
    group: 'node',
    name: 'nodeLabelRotation',
    displayName: 'Label Rotation',
    type: 'number',
    defaultValue: 360,
    bypassMap: new Map(),
    maxVal: 360,
    tooltip: 'The rotation angle of the node label in degrees(from 0 to 360).',
  },
  nodeLabelOpacity: {
    group: 'node',
    name: 'nodeLabelOpacity',
    displayName: 'Label Opacity',
    type: 'number',
    defaultValue: 1.0,
    bypassMap: new Map(),
    maxVal: 1,
    tooltip: 'The transparency of the node label. 100% is fully opaque, 0% is fully transparent.',
  },
  nodeLabelPosition: {
    group: 'node',
    name: 'nodeLabelPosition',
    displayName: 'Label Position',
    type: 'nodeLabelPosition',
    defaultValue: DEFAULT_NODE_LABEL_POSITION,
    bypassMap: new Map(),
  },
  // nodePositionX: {
  //   group: 'node',
  //   name: 'nodePositionX',
  //   displayName: 'Position X',
  //   type: 'number',
  //   defaultValue: 0,
  //   bypassMap: new Map(),
  // },
  // nodePositionY: {
  //   group: 'node',
  //   name: 'nodePositionY',
  //   displayName: 'Position Y',
  //   type: 'number',
  //   defaultValue: 0,
  //   bypassMap: new Map(),
  // },
  // nodePositionZ: {
  //   group: 'node',
  //   name: 'nodePositionZ',
  //   displayName: 'Position Z',
  //   type: 'number',
  //   defaultValue: 0,
  //   bypassMap: new Map(),
  // },
  nodeOpacity: {
    group: 'node',
    name: 'nodeOpacity',
    displayName: 'Opacity',
    type: 'number',
    defaultValue: 1.0,
    bypassMap: new Map(),
    maxVal: 1,
    tooltip: 'The transparency of the node fill. 100% is fully opaque, 0% is fully transparent.',
  },
  nodeVisibility: {
    group: 'node',
    name: 'nodeVisibility',
    displayName: 'Visibility',
    type: 'visibility',
    defaultValue: 'element',
    bypassMap: new Map(),
    tooltip:'The flag to show or hide the node.',
  },
  nodeSelectedPaint: {
    group: 'node',
    name: 'nodeSelectedPaint',
    displayName: 'Selected Color',
    type: 'color',
    defaultValue: 'yellow',
    bypassMap: new Map(),
  },
  nodeMaxLabelWidth: {
    group: 'node',
    name: 'nodeMaxLabelWidth',
    displayName: 'Label Width',
    type: 'number',
    defaultValue: 100,
    bypassMap: new Map(),
    tooltip: 'The maximum width of the node label.',
  },
  nodeZOrder: {
    group: 'node',
    name: 'nodeZOrder',
    displayName: 'Z Order',
    type: 'number',
    defaultValue: 0,
    bypassMap: new Map(),
    tooltip: 'The stacking order of nodes on the canvas. Higher values are drawn on top.'
  },
  edgeLineColor: {
    group: 'edge',
    name: 'edgeLineColor',
    displayName: 'Stroke Color',
    type: 'color',
    defaultValue: '#000000',
    bypassMap: new Map(),
    tooltip: 'The fill color of the edge line when not selected.',
  },
  edgeLineType: {
    group: 'edge',
    name: 'edgeLineType',
    displayName: 'Line Type',
    type: 'edgeLine',
    defaultValue: 'solid',
    bypassMap: new Map(),
  },
  edgeOpacity: {
    group: 'edge',
    name: 'edgeOpacity',
    displayName: 'Opacity',
    type: 'number',
    defaultValue: 1.0,
    bypassMap: new Map(),
    maxVal: 1,
    tooltip: 'The transparency of the edge. 100% is fully opaque, 0% is fully transparent.',
  },
  edgeSourceArrowColor: {
    group: 'edge',
    name: 'edgeSourceArrowColor',
    displayName: 'Source Arrow Color',
    type: 'color',
    defaultValue: '#000000',
    bypassMap: new Map(),
    tooltip: 'The color of the edge source arrow when not selected.',
  },
  edgeSourceArrowShape: {
    group: 'edge',
    name: 'edgeSourceArrowShape',
    displayName: 'Source Arrow Shape',
    type: 'edgeArrowShape',
    defaultValue: 'none',
    bypassMap: new Map(),
  },
  edgeTargetArrowColor: {
    group: 'edge',
    name: 'edgeTargetArrowColor',
    displayName: 'Target Arrow Color',
    type: 'color',
    defaultValue: '#000000',
    bypassMap: new Map(),
    tooltip: 'The color of the edge target arrow when not selected.',
  },
  edgeTargetArrowShape: {
    group: 'edge',
    name: 'edgeTargetArrowShape',
    displayName: 'Target Arrow Shape',
    type: 'edgeArrowShape',
    defaultValue: 'none',
    bypassMap: new Map(),
  },
  edgeLabel: {
    group: 'edge',
    name: 'edgeLabel',
    displayName: 'Label',
    type: 'string',
    defaultValue: '',
    bypassMap: new Map(),
  },
  edgeLabelColor: {
    group: 'edge',
    name: 'edgeLabelColor',
    displayName: 'Label Color',
    type: 'color',
    defaultValue: '#000000',
    bypassMap: new Map(),
  },
  edgeLabelFontSize: {
    group: 'edge',
    name: 'edgeLabelFontSize',
    displayName: 'Label Font Size',
    type: 'number',
    defaultValue: 12,
    bypassMap: new Map(),
  },
  edgeLabelFont: {
    group: 'edge',
    name: 'edgeLabelFont',
    displayName: 'Label Font',
    type: 'font',
    defaultValue: 'serif',
    bypassMap: new Map(),
  },
  edgeLabelRotation: {
    group: 'edge',
    name: 'edgeLabelRotation',
    displayName: 'Label Rotation',
    type: 'number',
    defaultValue: 0,
    bypassMap: new Map(),
    maxVal: 360,
    tooltip: 'The rotation angle of the edge label in degrees(from 0 to 360).',
  },
  edgeLabelOpacity: {
    group: 'edge',
    name: 'edgeLabelOpacity',
    displayName: 'Label Opacity',
    defaultValue: 1.0,
    type: 'number',
    bypassMap: new Map(),
    maxVal: 1,
    tooltip: 'The transparency of the edge label. 100% is fully opaque, 0% is fully transparent.',
  },
  // edgeLabelAutoRotation: {
  //   group: 'edge',
  //   name: 'edgeLabelAutoRotation',
  //   displayName: 'Label Auto Rotation',
  //   defaultValue: true,
  //   type: 'boolean',
  //   bypassMap: new Map(),
  // },
  edgeWidth: {
    group: 'edge',
    name: 'edgeWidth',
    displayName: 'Width',
    type: 'number',
    defaultValue: 1,
    bypassMap: new Map(),
  },
  edgeVisibility: {
    group: 'edge',
    name: 'edgeVisibility',
    displayName: 'Visibility',
    type: 'visibility',
    defaultValue: 'element',
    bypassMap: new Map(),
    tooltip:'The flag to show or hide the edge.',
  },
  edgeSelectedPaint: {
    group: 'edge',
    name: 'edgeSelectedPaint',
    displayName: 'Selected Color',
    type: 'color',
    defaultValue: 'red',
    bypassMap: new Map(),
  },
  edgeMaxLabelWidth: {
    group: 'edge',
    name: 'edgeMaxLabelWidth',
    displayName: 'Label Width',
    type: 'number',
    defaultValue: 100,
    bypassMap: new Map(),
    tooltip: 'The maximum width of the edge label.',
  },
  edgeZOrder: {
    group: 'edge',
    name: 'edgeZOrder',
    displayName: 'Z Order',
    type: 'number',
    defaultValue: 0,
    bypassMap: new Map(),
    tooltip: 'The stacking order of edges on the canvas. Higher values are drawn on top.'
  },
  pieSize: {
    group: 'node',
    name: 'pieSize',
    displayName: 'Pie Size',
    type: 'number',
    defaultValue: 100,
    bypassMap: new Map(),
    tooltip: 'The diameter of the pie chart as a percentage of the node size (or an absolute value).',
  },
  pie1BackgroundColor: {
    group: 'node',
    name: 'pie1BackgroundColor',
    displayName: 'Pie Slice 1 Color',
    type: 'color',
    defaultValue: '#FFFFFF',
    bypassMap: new Map(),
    tooltip: 'The color for pie slice 1.',
  },
  pie1BackgroundSize: {
    group: 'node',
    name: 'pie1BackgroundSize',
    displayName: 'Pie Slice 1 Size',
    type: 'number',
    defaultValue: 50,
    bypassMap: new Map(),
    tooltip: 'The size of pie slice 1 as a percentage of the pie size.',
  },
  pie1BackgroundOpacity: {
    group: 'node',
    name: 'pie1BackgroundOpacity',
    displayName: 'Pie Slice 1 Opacity',
    type: 'number',
    defaultValue: 1,
    bypassMap: new Map(),
    maxVal: 1,
    tooltip: 'The opacity of pie slice 1.',
  },
  pie2BackgroundColor: {
    group: 'node',
    name: 'pie2BackgroundColor',
    displayName: 'Pie Slice 1 Color',
    type: 'color',
    defaultValue: '#FFFFFF',
    bypassMap: new Map(),
    tooltip: 'The color for pie slice 1.',
  },
  pie2BackgroundSize: {
    group: 'node',
    name: 'pie2BackgroundSize',
    displayName: 'Pie Slice 1 Size',
    type: 'number',
    defaultValue: 50,
    bypassMap: new Map(),
    tooltip: 'The size of pie slice 1 as a percentage of the pie size.',
  },
  pie2BackgroundOpacity: {
    group: 'node',
    name: 'pie2BackgroundOpacity',
    displayName: 'Pie Slice 1 Opacity',
    type: 'number',
    defaultValue: 1,
    bypassMap: new Map(),
    maxVal: 1,
    tooltip: 'The opacity of pie slice 1.',
  },
  networkBackgroundColor: {
    group: 'network',
    name: 'networkBackgroundColor',
    type: 'color',
    displayName: 'Background Color',
    defaultValue: '#FFFFFF',
    bypassMap: new Map(),
  },
})
