import { VisualStyle } from '../VisualStyle'

export const defaultVisualStyle: VisualStyle = {
  nodeShape: {
    group: 'node',
    name: 'nodeShape',
    type: 'nodeShape',
    displayName: 'shape',
    defaultValue: 'ellipse',
    mapping: null,
    bypassMap: {},
  },
  nodeBorderColor: {
    group: 'node',
    name: 'nodeBorderColor',
    displayName: 'border color',
    type: 'color',
    defaultValue: '#000000',
    mapping: null,
    bypassMap: {},
  },
  nodeBorderLineType: {
    group: 'node',
    name: 'nodeBorderLineType',
    displayName: 'border line',
    type: 'nodeBorderLine',
    defaultValue: 'solid',
    mapping: null,
    bypassMap: {},
  },
  nodeBorderWidth: {
    group: 'node',
    name: 'nodeBorderWidth',
    displayName: 'border width',
    type: 'number',
    defaultValue: 1,
    mapping: null,
    bypassMap: {},
  },
  nodeBorderOpacity: {
    group: 'node',
    name: 'nodeBorderOpacity',
    displayName: 'border opacity',
    type: 'number',
    defaultValue: 1.0,
    mapping: null,
    bypassMap: {},
  },
  nodeHeight: {
    group: 'node',
    name: 'nodeHeight',
    displayName: 'height',
    type: 'number',
    defaultValue: 40,
    mapping: null,
    bypassMap: {},
  },
  nodeWidth: {
    group: 'node',
    name: 'nodeWidth',
    displayName: 'width',
    type: 'number',
    defaultValue: 40,
    mapping: null,
    bypassMap: {},
  },
  nodeBackgroundColor: {
    group: 'node',
    name: 'nodeBackgroundColor',
    displayName: 'background color',
    type: 'color',
    defaultValue: '#FFFFFF',
    mapping: null,
    bypassMap: {},
  },
  nodeLabel: {
    group: 'node',
    name: 'nodeLabel',
    displayName: 'label',
    type: 'string',
    defaultValue: '',
    mapping: null,
    bypassMap: {},
  },
  nodeLabelColor: {
    group: 'node',
    name: 'nodeLabelColor',
    displayName: 'label color',
    type: 'color',
    defaultValue: '#000000',
    mapping: null,
    bypassMap: {},
  },
  nodeLabelFontSize: {
    group: 'node',
    name: 'nodeLabelFontSize',
    displayName: 'label font size',
    type: 'number',
    defaultValue: 12,
    mapping: null,
    bypassMap: {},
  },
  nodeLabelFont: {
    group: 'node',
    name: 'nodeLabelFont',
    displayName: 'label font',
    type: 'font',
    defaultValue: 'serif',
    mapping: null,
    bypassMap: {},
  },
  nodeLabelHorizontalAlign: {
    group: 'node',
    name: 'nodeLabelHorizontalAlign',
    displayName: 'label horizontal align',
    type: 'horizontalAlign',
    defaultValue: 'center',
    mapping: null,
    bypassMap: {},
  },
  nodeLabelVerticalAlign: {
    group: 'node',
    name: 'nodeLabelVerticalAlign',
    displayName: 'label vertical align',
    type: 'verticalAlign',
    defaultValue: 'center',
    mapping: null,
    bypassMap: {},
  },
  nodeLabelRotation: {
    group: 'node',
    name: 'nodeLabelRotation',
    displayName: 'label rotation',
    type: 'number',
    defaultValue: 0,
    mapping: null,
    bypassMap: {},
  },
  nodeLabelOpacity: {
    group: 'node',
    name: 'nodeLabelOpacity',
    displayName: 'label opacity',
    type: 'number',
    defaultValue: 1.0,
    mapping: null,
    bypassMap: {},
  },
  nodePositionX: {
    group: 'node',
    name: 'nodePositionX',
    displayName: 'position x',
    type: 'number',
    defaultValue: 0,
    mapping: null,
    bypassMap: {},
  },
  nodePositionY: {
    group: 'node',
    name: 'nodePositionY',
    displayName: 'position y',
    type: 'number',
    defaultValue: 0,
    mapping: null,
    bypassMap: {},
  },
  nodePositionZ: {
    group: 'node',
    name: 'nodePositionZ',
    displayName: 'position z',
    type: 'number',
    defaultValue: 0,
    mapping: null,
    bypassMap: {},
  },
  nodeOpacity: {
    group: 'node',
    name: 'nodeOpacity',
    displayName: 'opacity',
    type: 'number',
    defaultValue: 1.0,
    mapping: null,
    bypassMap: {},
  },
  nodeVisibility: {
    group: 'node',
    name: 'nodeVisibility',
    displayName: 'visibility',
    type: 'visibility',
    defaultValue: 'element',
    mapping: null,
    bypassMap: {},
  },
  edgeLineColor: {
    group: 'edge',
    name: 'edgeLineColor',
    displayName: 'line color',
    type: 'color',
    defaultValue: '#000000',
    mapping: null,
    bypassMap: {},
  },
  edgeLineType: {
    group: 'edge',
    name: 'edgeLineType',
    displayName: 'line type',
    type: 'edgeLine',
    defaultValue: 'solid',
    mapping: null,
    bypassMap: {},
  },
  edgeOpacity: {
    group: 'edge',
    name: 'edgeOpacity',
    displayName: 'opacity',
    type: 'number',
    defaultValue: 1.0,
    mapping: null,
    bypassMap: {},
  },
  edgeSourceArrowColor: {
    group: 'edge',
    name: 'edgeSourceArrowColor',
    displayName: 'source arrow color',
    type: 'color',
    defaultValue: '#000000',
    mapping: null,
    bypassMap: {},
  },
  edgeSourceArrowShape: {
    group: 'edge',
    name: 'edgeSourceArrowShape',
    displayName: 'source arrow shape',
    type: 'edgeArrowShape',
    defaultValue: 'none',
    mapping: null,
    bypassMap: {},
  },
  edgeTargetArrowColor: {
    group: 'edge',
    name: 'edgeTargetArrowColor',
    displayName: 'target arrow color',
    type: 'color',
    defaultValue: '#000000',
    mapping: null,
    bypassMap: {},
  },
  edgeTargetArrowShape: {
    group: 'edge',
    name: 'edgeTargetArrowShape',
    displayName: 'target arrow shape',
    type: 'edgeArrowShape',
    defaultValue: 'none',
    mapping: null,
    bypassMap: {},
  },
  edgeLabel: {
    group: 'edge',
    name: 'edgeLabel',
    displayName: 'label',
    type: 'string',
    defaultValue: '',
    mapping: null,
    bypassMap: {},
  },
  edgeLabelColor: {
    group: 'edge',
    name: 'edgeLabelColor',
    displayName: 'label color',
    type: 'color',
    defaultValue: '#000000',
    mapping: null,
    bypassMap: {},
  },
  edgeLabelFontSize: {
    group: 'edge',
    name: 'edgeLabelFontSize',
    displayName: 'label font size',
    type: 'number',
    defaultValue: 12,
    mapping: null,
    bypassMap: {},
  },
  edgeLabelFont: {
    group: 'edge',
    name: 'edgeLabelFont',
    displayName: 'label font',
    type: 'font',
    defaultValue: 'serif',
    mapping: null,
    bypassMap: {},
  },
  edgeLabelRotation: {
    group: 'edge',
    name: 'edgeLabelRotation',
    displayName: 'label rotation',
    type: 'number',
    defaultValue: 0,
    mapping: null,
    bypassMap: {},
  },
  edgeLabelOpacity: {
    group: 'edge',
    name: 'edgeLabelOpacity',
    displayName: 'label opacity',
    defaultValue: 1.0,
    type: 'number',
    mapping: null,
    bypassMap: {},
  },
  edgeLabelAutoRotation: {
    group: 'edge',
    name: 'edgeLabelAutoRotation',
    displayName: 'label auto rotation',
    defaultValue: true,
    type: 'boolean',
    mapping: null,
    bypassMap: {},
  },
  edgeWidth: {
    group: 'edge',
    name: 'edgeWidth',
    displayName: 'width',
    type: 'number',
    defaultValue: 1,
    mapping: null,
    bypassMap: {},
  },
  edgeVisibility: {
    group: 'edge',
    name: 'edgeVisibility',
    displayName: 'visibility',
    type: 'visibility',
    defaultValue: 'element',
    mapping: null,
    bypassMap: {},
  },
  networkBackgroundColor: {
    group: 'network',
    name: 'networkBackgroundColor',
    type: 'color',
    displayName: 'background color',
    defaultValue: '#FFFFFF',
    mapping: null,
    bypassMap: {},
  },
}