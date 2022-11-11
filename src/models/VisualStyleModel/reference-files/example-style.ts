import { VisualStyle } from '../VisualStyle'
import { ValueType } from '../../TableModel'
import { VisualPropertyValueType } from '../VisualPropertyValue'
import { DiscreteMappingFunction } from '../VisualMappingFunction'

const vs: VisualStyle = {
  nodeShape: {
    name: 'nodeShape',
    default: 'ellipse',
    mapping: {
      type: 'discrete',
      attribute: 'nodeAttr1',
      map: (value: ValueType) => {
        if (value === 'value1') {
          return 'rectangle'
        } else {
          return 'ellipse'
        }
      },
      vpValueMap: [
        { value: 'value1', vpValue: 'rectangle' },
        { value: 'default', vpValue: 'ellipse' },
      ],
    } as DiscreteMappingFunction,
    bypassMap: {
      node1: 'triangle',
      node5: 'circle',
    },
  },
  nodeBorderColor: {
    name: 'nodeBorderColor',
    default: '#000000',
    mapping: null,
    bypassMap: {},
  },
  nodeBorderLineType: {
    name: 'nodeBorderLineType',
    default: 'solid',
    mapping: null,
    bypassMap: {},
  },
  nodeBorderWidth: {
    name: 'nodeBorderWidth',
    default: 1,
    mapping: null,
    bypassMap: {},
  },
  nodeBorderOpacity: {
    name: 'nodeBorderOpacity',
    default: 1.0,
    mapping: null,
    bypassMap: {},
  },
  nodeHeight: {
    name: 'nodeHeight',
    default: 40,
    mapping: null,
    bypassMap: {},
  },
  nodeWidth: {
    name: 'nodeWidth',
    default: 40,
    mapping: null,
    bypassMap: {},
  },
  nodeBackgroundColor: {
    name: 'nodeBackgroundColor',
    default: '#FFFFFF',
    mapping: null,
    bypassMap: {},
  },
  nodeLabel: {
    name: 'nodeLabel',
    default: '',
    mapping: {
      type: 'passthrough',
      attribute: 'name',
      map: (value: ValueType) => value as VisualPropertyValueType,
    },
    bypassMap: {},
  },
  nodeLabelColor: {
    name: 'nodeLabelColor',
    default: '#000000',
    mapping: null,
    bypassMap: {},
  },
  nodeLabelFontSize: {
    name: 'nodeLabelFontSize',
    default: 12,
    mapping: null,
    bypassMap: {},
  },
  nodeLabelFont: {
    name: 'nodeLabelFont',
    default: 'Arial',
    mapping: null,
    bypassMap: {},
  },
  nodeLabelPosition: {
    name: 'nodeLabelPosition',
    default: {
      horizontalAlign: 'center',
      verticalAlign: 'center',
    },
    mapping: null,
    bypassMap: {},
  },
  nodeLabelRotation: {
    name: 'nodeLabelRotation',
    default: 0,
    mapping: null,
    bypassMap: {},
  },
  nodeLabelOpacity: {
    name: 'nodeLabelOpacity',
    default: 1.0,
    mapping: null,
    bypassMap: {},
  },
  nodePositionX: {
    name: 'nodePositionX',
    default: 0,
    mapping: null,
    bypassMap: {},
  },
  nodePositionY: {
    name: 'nodePositionY',
    default: 0,
    mapping: null,
    bypassMap: {},
  },
  nodePositionZ: {
    name: 'nodePositionZ',
    default: 0,
    mapping: null,
    bypassMap: {},
  },
  nodeOpacity: {
    name: 'nodeOpacity',
    default: 1.0,
    mapping: null,
    bypassMap: {},
  },
  nodeVisibility: {
    name: 'nodeVisibility',
    default: true,
    mapping: null,
    bypassMap: {},
  },
  edgeLineColor: {
    name: 'edgeLineColor',
    default: '#000000',
    mapping: null,
    bypassMap: {},
  },
  edgeLineType: {
    name: 'edgeLineType',
    default: 'solid',
    mapping: null,
    bypassMap: {},
  },
  edgeOpacity: {
    name: 'edgeOpacity',
    default: 1.0,
    mapping: null,
    bypassMap: {},
  },
  edgeSourceArrowColor: {
    name: 'edgeSourceArrowColor',
    default: '#000000',
    mapping: null,
    bypassMap: {},
  },
  edgeSourceArrowShape: {
    name: 'edgeSourceArrowShape',
    default: 'none',
    mapping: null,
    bypassMap: {},
  },
  edgeTargetArrowColor: {
    name: 'edgeTargetArrowColor',
    default: '#000000',
    mapping: null,
    bypassMap: {},
  },
  edgeTargetArrowShape: {
    name: 'edgeTargetArrowShape',
    default: 'none',
    mapping: null,
    bypassMap: {},
  },
  edgeLabel: {
    name: 'edgeLabel',
    default: '',
    mapping: null,
    bypassMap: {},
  },
  edgeLabelColor: {
    name: 'edgeLabelColor',
    default: '#000000',
    mapping: null,
    bypassMap: {},
  },
  edgeLabelFontSize: {
    name: 'edgeLabelFontSize',
    default: 12,
    mapping: null,
    bypassMap: {},
  },
  edgeLabelFont: {
    name: 'edgeLabelFont',
    default: 'Arial',
    mapping: null,
    bypassMap: {},
  },
  edgeLabelRotation: {
    name: 'edgeLabelRotation',
    default: 0,
    mapping: null,
    bypassMap: {},
  },
  edgeLabelOpacity: {
    name: 'edgeLabelOpacity',
    default: 1.0,
    mapping: null,
    bypassMap: {},
  },
  edgeLabelAutoRotation: {
    name: 'edgeLabelAutoRotation',
    default: true,
    mapping: null,
    bypassMap: {},
  },
  edgeWidth: {
    name: 'edgeWidth',
    default: 1,
    mapping: null,
    bypassMap: {},
  },
  edgeVisibility: {
    name: 'edgeVisibility',
    default: true,
    mapping: null,
    bypassMap: {},
  },
  networkBackgroundColor: {
    name: 'networkBackgroundColor',
    default: '#FFFFFF',
    mapping: null,
    bypassMap: {},
  },
}
vs
