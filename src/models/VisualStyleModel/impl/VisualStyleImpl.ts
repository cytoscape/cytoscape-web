import { VisualStyle } from '..'
import { Cx2 } from '../../../utils/cx/Cx2'
import * as cxUtil from '../../../utils/cx/cx2-util'
import { VisualPropertyName } from '../VisualPropertyName'

import { VisualStyleChangeSet } from '../VisualStyleFn'

import {
  cxVisualPropertyConverter,
  CXVisualPropertyValue,
} from './cxVisualPropertyMap'

export const nodeVisualProperties = (visualStyle: VisualStyle) => {
  return Object.keys(visualStyle).filter((key) => key.startsWith('node'))
}

export const edgeVisualProperties = (visualStyle: VisualStyle) => {
  return Object.keys(visualStyle).filter((key) => key.startsWith('edge'))
}

export const networkVisualProperties = (visualStyle: VisualStyle) => {
  return Object.keys(visualStyle).filter((key) => key.startsWith('network'))
}

const defaultVisualStyle: VisualStyle = {
  nodeShape: {
    name: 'nodeShape',
    default: 'ellipse',
    mapping: null,
    bypassMap: {},
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
    mapping: null,
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
    default: 'element',
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
    default: 'element',
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

export const createVisualStyle = (): VisualStyle => {
  return defaultVisualStyle
}

export const createVisualStyleFromCx = (cx: Cx2): VisualStyle => {
  const visualStyle: VisualStyle = createVisualStyle()
  const visualProperties = cxUtil.getVisualProperties(cx)
  const nodeBypasses = cxUtil.getNodeBypasses(cx)
  const edgeBypasses = cxUtil.getEdgeBypasses(cx)
  const defaultNodeProperties =
    visualProperties.visualProperties[0].default.node
  const defaultEdgeProperties =
    visualProperties.visualProperties[0].default.edge
  const defaultNetworkProperties =
    visualProperties.visualProperties[0].default.network
  const nodeMapping = visualProperties.visualProperties[0].nodeMapping
  const edgeMapping = visualProperties.visualProperties[0].edgeMapping

  const vpGroups = [
    {
      vps: nodeVisualProperties(visualStyle),
      getDefault: (cxVPName: string) => defaultNodeProperties[cxVPName],
      getMapping: (cxVPName: string) => nodeMapping[cxVPName],
      getBypass: (cxVPName: string) => {}, // TODO
    },
    {
      vps: edgeVisualProperties(visualStyle),
      getDefault: (cxVPName: string) => defaultEdgeProperties[cxVPName],
      getMapping: (cxVPName: string) => edgeMapping[cxVPName],
      getBypass: (cxVPName: string) => {}, // TODO
    },
    {
      vps: networkVisualProperties(visualStyle),
      getDefault: (cxVPName: string) => defaultNetworkProperties[cxVPName],
      getMapping: (cxVPName: string) => null,
      getBypass: (cxVPName: string) => {}, // TODO
    },
  ]

  vpGroups.forEach((group) => {
    const { vps, getDefault, getMapping, getBypass } = group
    vps.forEach((vpName: VisualPropertyName) => {
      const converter = cxVisualPropertyConverter[vpName]

      if (converter) {
        const value = getDefault(converter.cxVPName) as CXVisualPropertyValue
        // const mapping = getMapping(converter.cxVPName)
        // const bypass = getBypass(converter.cxVPName)

        visualStyle[vpName].default =
          value != null
            ? converter.valueConverter(value)
            : visualStyle[vpName].default

        // todo convert bypasses and mappings
        // visualStyle[vpName].mapping = mapping != null ? converter.mappingConverter(mapping) : visualStyle[vpName].mapping
        // visualStyle[vpName].bypassMap = bypass != null ? converter.bypassConverter(bypass) : visualStyle[vpName].bypassMap
      }
    })
  })

  return visualStyle
}

export const setVisualStyle = (
  visualStyle: VisualStyle,
  changeSet: VisualStyleChangeSet,
) => {
  return { ...visualStyle, ...changeSet }
}
