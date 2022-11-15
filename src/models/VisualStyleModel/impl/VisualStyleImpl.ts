import { VisualStyle } from '..'
import { Cx2 } from '../../../utils/cx/Cx2'
import * as cxUtil from '../../../utils/cx/cx2-util'
import { Network } from '../../NetworkModel'
import { Table, ValueType } from '../../TableModel'
import { EdgeView, NetworkView } from '../../ViewModel'
import {
  DiscreteMappingFunction,
  ContinuousMappingFunction,
} from '../VisualMappingFunction'
import { VisualPropertyName } from '../VisualPropertyName'

import { VisualStyleChangeSet } from '../VisualStyleFn'
import { VisualPropertyValueType, VisualProperty, Bypass } from '..'

import { NodeView } from '../../ViewModel'

import {
  CXId,
  CXVisualMappingFunction,
  cxVisualPropertyConverter,
  CXVisualPropertyConverter,
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

// convert cx visual properties to app visual style model
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

  const nodeBypassMap: Map<
    VisualPropertyName,
    Bypass<VisualPropertyValueType>
  > = new Map()
  const edgeBypassMap: Map<
    VisualPropertyName,
    Bypass<VisualPropertyValueType>
  > = new Map()

  nodeBypasses?.nodeBypasses.forEach(
    (entry: { id: CXId; v: Record<string, object> }) => {
      const { id, v } = entry
      Object.keys(v).forEach((cxVPName) => {
        const entry = Object.entries(cxVisualPropertyConverter).find(
          ([vpName, cxVPConverter]) => cxVPConverter.cxVPName === cxVPName,
        )

        if (entry != null) {
          const [vpName, cxVPConverter] = entry as [
            VisualPropertyName,
            CXVisualPropertyConverter<VisualPropertyValueType>,
          ]

          if (nodeBypassMap.has(vpName)) {
            const entry = nodeBypassMap.get(vpName) ?? {}
            entry[id] = cxVPConverter.valueConverter(
              v[cxVPName] as CXVisualPropertyValue,
            )
            nodeBypassMap.set(vpName, entry)
          } else {
            nodeBypassMap.set(vpName, {})
          }
        }
      })
    },
  )

  edgeBypasses?.edgeBypasses.forEach(
    (entry: { id: CXId; v: Record<string, object> }) => {
      const { id, v } = entry
      Object.keys(v).forEach((cxVPName) => {
        const entry = Object.entries(cxVisualPropertyConverter).find(
          ([vpName, cxVPConverter]) => cxVPConverter.cxVPName === cxVPName,
        )

        if (entry != null) {
          const [vpName, cxVPConverter] = entry as [
            VisualPropertyName,
            CXVisualPropertyConverter<VisualPropertyValueType>,
          ]

          if (edgeBypassMap.has(vpName)) {
            const entry = edgeBypassMap.get(vpName) ?? {}
            entry[id] = cxVPConverter.valueConverter(
              v[cxVPName] as CXVisualPropertyValue,
            )
            edgeBypassMap.set(vpName, entry)
          } else {
            edgeBypassMap.set(vpName, {})
          }
        }
      })
    },
  )

  const vpGroups = [
    {
      vps: nodeVisualProperties(visualStyle),
      getDefault: (cxVPName: string) => defaultNodeProperties[cxVPName],
      getMapping: (
        cxVPName: string,
      ): CXVisualMappingFunction<CXVisualPropertyValue> | null =>
        nodeMapping[cxVPName] as CXVisualMappingFunction<CXVisualPropertyValue>,
      getBypass: (): Map<VisualPropertyName, Bypass<VisualPropertyValueType>> =>
        nodeBypassMap, // TODO
    },
    {
      vps: edgeVisualProperties(visualStyle),
      getDefault: (cxVPName: string) => defaultEdgeProperties[cxVPName],
      getMapping: (
        cxVPName: string,
      ): CXVisualMappingFunction<CXVisualPropertyValue> | null =>
        edgeMapping[cxVPName] as CXVisualMappingFunction<CXVisualPropertyValue>,
      getBypass: (): Map<VisualPropertyName, Bypass<VisualPropertyValueType>> =>
        edgeBypassMap,
    },
    {
      vps: networkVisualProperties(visualStyle),
      getDefault: (cxVPName: string) => defaultNetworkProperties[cxVPName],
      getMapping: (cxVPName: string) => null,
      getBypass: () => new Map(), // no mappings or bypasses for network vps
    },
  ]

  vpGroups.forEach((group) => {
    const { vps, getDefault, getMapping, getBypass } = group
    vps.forEach((vpName: VisualPropertyName) => {
      const converter = cxVisualPropertyConverter[vpName]

      const isSupportedCXProperty = converter != null

      if (isSupportedCXProperty) {
        const cxDefault = getDefault(
          converter.cxVPName,
        ) as CXVisualPropertyValue
        const cxMapping = getMapping(converter.cxVPName)
        const cxBypass = getBypass()

        if (cxDefault != null) {
          visualStyle[vpName].default = converter.valueConverter(cxDefault)
        }

        if (cxMapping != null) {
          switch (cxMapping.type) {
            case 'PASSTHROUGH':
              visualStyle[vpName].mapping = {
                type: 'passthrough',
                attribute: cxMapping.definition.attribute,
              }
              break
            case 'DISCRETE':
              visualStyle[vpName].mapping = {
                type: 'discrete',
                attribute: cxMapping.definition.attribute,
                default: visualStyle[vpName].default,
                vpValueMap: cxMapping.definition.map.map((mapEntry) => {
                  const { v, vp } = mapEntry
                  return {
                    value: v,
                    vpValue: converter.valueConverter(vp),
                  }
                }),
              } as DiscreteMappingFunction
              break
            case 'CONTINUOUS':
              visualStyle[vpName].mapping = {
                type: 'continuous',
                attribute: cxMapping.definition.attribute,
                intervals: cxMapping.definition.map.map((interval) => {
                  const convertedInterval = { ...interval }
                  if (
                    convertedInterval.includeMin &&
                    convertedInterval.minVPValue != null
                  ) {
                    convertedInterval.minVPValue = converter.valueConverter(
                      convertedInterval.minVPValue,
                    )
                  }

                  if (
                    convertedInterval.includeMax &&
                    convertedInterval.maxVPValue != null
                  ) {
                    convertedInterval.maxVPValue = converter.valueConverter(
                      convertedInterval.maxVPValue,
                    )
                  }

                  return convertedInterval
                }),
              } as ContinuousMappingFunction
              break
            default:
              break
          }
        }

        if (cxBypass != null) {
          visualStyle[vpName].bypassMap = cxBypass.get(vpName)
        }
      } else {
        // property is not found in cx, in theory all cytoscape web properties should be in
        // cx, if this happens, it is a bug
        throw new Error(`Property ${vpName} not found in CX`)
      }
    })

    // some cx properties are probably not handled in this conversion,
    // we should find a way to store them and then restore them when we round trip
  })

  return visualStyle
}

export const setVisualStyle = (
  visualStyle: VisualStyle,
  changeSet: VisualStyleChangeSet,
) => {
  return { ...visualStyle, ...changeSet }
}

export const applyVisualStyle = (
  vs: VisualStyle,
  network: Network,
  nodeTable: Table,
  edgeTable: Table,
): NetworkView => {
  const nodeViews = network.nodes.map((node) => {
    const computedVisualProperties: {
      vpName: VisualPropertyName
      vpValue: VisualPropertyValueType
    }[] = []

    nodeVisualProperties(vs).forEach((vpName: VisualPropertyName) => {
      const vp = vs[vpName] as VisualProperty<VisualPropertyValueType>
      const vpValue = vp.bypassMap?.[node.id] ?? vp.default
      computedVisualProperties.push({ vpName, vpValue })
    })
    const nodeView: NodeView = {
      id: node.id,
      computedVisualProperties: computedVisualProperties as {
        vpName: VisualPropertyName
        vpValue: VisualPropertyValueType
      }[],
    }
    return nodeView
  })

  const edgeViews = network.edges.map((edge) => {
    const computedVisualProperties: {
      vpName: VisualPropertyName
      vpValue: VisualPropertyValueType
    }[] = []

    nodeVisualProperties(vs).forEach((vpName: VisualPropertyName) => {
      const vp = vs[vpName] as VisualProperty<VisualPropertyValueType>
      const vpValue = vp.bypassMap?.[edge.id] ?? vp.default
      computedVisualProperties.push({ vpName, vpValue })
    })
    const edgeView: EdgeView = {
      id: edge.id,
      computedVisualProperties: computedVisualProperties as {
        vpName: VisualPropertyName
        vpValue: VisualPropertyValueType
      }[],
    }
    return edgeView
  })
  const networkView = {
    id: network.id,
    nodeViews,
    edgeViews,
  }

  return networkView
}
