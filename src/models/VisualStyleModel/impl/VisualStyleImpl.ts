import _ from 'lodash'
import { Cx2 } from '../../../utils/cx/Cx2'
import * as cxUtil from '../../../utils/cx/cx2-util'
import { Network } from '../../NetworkModel'
import { Table, ValueType } from '../../TableModel'
import { NetworkView } from '../../ViewModel'
import {
  DiscreteMappingFunction,
  ContinuousMappingFunction,
} from '../VisualMappingFunction'
import { ContinuousFunctionControlPoint } from '../VisualMappingFunction/ContinuousMappingFunction'
import { VisualPropertyName } from '../VisualPropertyName'

import {
  VisualStyle,
  VisualPropertyValueType,
  VisualProperty,
  Bypass,
} from '..'

import { cyJsVisualPropertyConverter } from './cyJsVisualPropertyConverter'

import {
  CXId,
  CXVisualMappingFunction,
  cxVisualPropertyConverter,
  CXVisualPropertyConverter,
  CXVisualPropertyValue,
} from './cxVisualPropertyConverter'

import {
  NodeSingular,
  Stylesheet,
  ElementDefinition,
  ElementGroup,
  EdgeSingular,
} from 'cytoscape'
import { defaultVisualStyle } from './DefaultVisualStyle'
import { IdType } from '../../IdType'
import { createCyJsMappingFn } from './MappingFunctionImpl'

export const nodeVisualProperties = (
  visualStyle: VisualStyle,
): Array<VisualProperty<VisualPropertyValueType>> => {
  return Object.values(visualStyle).filter((value) => value.group === 'node')
}

export const edgeVisualProperties = (
  visualStyle: VisualStyle,
): Array<VisualProperty<VisualPropertyValueType>> => {
  return Object.values(visualStyle).filter((value) => value.group === 'edge')
}

export const networkVisualProperties = (
  visualStyle: VisualStyle,
): Array<VisualProperty<VisualPropertyValueType>> => {
  return Object.values(visualStyle).filter((value) => value.group === 'network')
}

export const createVisualStyle = (): VisualStyle => {
  // create new copy of the default style instead of returning the same instance
  return JSON.parse(JSON.stringify(defaultVisualStyle))
}

// convert cx visual properties to app visual style model
export const createVisualStyleFromCx = (cx: Cx2): VisualStyle => {
  const visualStyle: VisualStyle = createVisualStyle()
  const visualProperties = cxUtil.getVisualProperties(cx)
  const nodeBypasses = cxUtil.getNodeBypasses(cx) ?? []
  const edgeBypasses = cxUtil.getEdgeBypasses(cx) ?? []
  const defaultNodeProperties =
    visualProperties.visualProperties[0]?.default?.node ?? {}
  const defaultEdgeProperties =
    visualProperties.visualProperties[0]?.default?.edge ?? {}
  const defaultNetworkProperties =
    visualProperties.visualProperties[0]?.default?.network ?? {}
  const nodeMapping = visualProperties.visualProperties[0]?.nodeMapping ?? {}
  const edgeMapping = visualProperties.visualProperties[0]?.edgeMapping ?? {}

  const nodeBypassMap: Map<
    VisualPropertyName,
    Bypass<VisualPropertyValueType>
  > = new Map()
  const edgeBypassMap: Map<
    VisualPropertyName,
    Bypass<VisualPropertyValueType>
  > = new Map()

  // group bypasses by visual property instead of by element
  nodeBypasses?.nodeBypasses?.forEach(
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
            const entry = nodeBypassMap.get(vpName) ?? new Map()
            entry.set(
              String(id),
              cxVPConverter.valueConverter(
                v[cxVPName] as CXVisualPropertyValue,
              ),
            )
            nodeBypassMap.set(vpName, entry)
          } else {
            nodeBypassMap.set(vpName, new Map())
          }
        }
      })
    },
  )

  // group bypasses by visual property instead of by element
  edgeBypasses?.nodeBypasses?.forEach(
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
            const entry = edgeBypassMap.get(vpName) ?? new Map()
            entry.set(
              String(id),
              cxVPConverter.valueConverter(
                v[cxVPName] as CXVisualPropertyValue,
              ),
            )
            edgeBypassMap.set(vpName, entry)
          } else {
            edgeBypassMap.set(vpName, new Map())
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
        nodeBypassMap,
    },
    {
      vps: edgeVisualProperties(visualStyle),
      getDefault: (cxVPName: string) => defaultEdgeProperties[cxVPName],
      getMapping: (
        cxVPName: string,
      ): CXVisualMappingFunction<CXVisualPropertyValue> | null =>
        edgeMapping?.[
          cxVPName
        ] as CXVisualMappingFunction<CXVisualPropertyValue>,
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
    vps.forEach((vp: VisualProperty<VisualPropertyValueType>) => {
      const { name: vpName } = vp
      const converter = cxVisualPropertyConverter[vpName]

      const isSupportedCXProperty = converter != null

      if (isSupportedCXProperty) {
        const cxDefault = getDefault(
          converter.cxVPName,
        ) as CXVisualPropertyValue
        const cxMapping = getMapping(converter.cxVPName)
        const cxBypass = getBypass()

        if (cxDefault != null) {
          visualStyle[vpName].defaultValue = converter.valueConverter(cxDefault)
        }

        if (cxMapping != null) {
          switch (cxMapping.type) {
            case 'PASSTHROUGH':
              visualStyle[vpName].mapping = {
                type: 'passthrough',
                attribute: cxMapping.definition.attribute,
              }
              break
            case 'DISCRETE': {
              const vpValueMap = new Map()
              cxMapping.definition.map.forEach((mapEntry) => {
                const { v, vp } = mapEntry
                vpValueMap.set(v, converter.valueConverter(vp))
              })
              const m: DiscreteMappingFunction = {
                type: 'discrete',
                attribute: cxMapping.definition.attribute,
                defaultValue: visualStyle[vpName].defaultValue,
                vpValueMap,
              }
              visualStyle[vpName].mapping = m
              break
            }
            case 'CONTINUOUS': {
              const numMapEntries = cxMapping.definition.map.length
              if (numMapEntries < 2) {
                visualStyle[vpName].mapping = null
                break
              }

              let min = null
              let max = null

              if (
                cxMapping.definition.map[0].max != null &&
                cxMapping.definition.map[0].maxVPValue != null
              ) {
                min = {
                  value: cxMapping.definition.map[0].max as ValueType,
                  vpValue: converter.valueConverter(
                    cxMapping.definition.map[0].maxVPValue,
                  ),
                  inclusive: cxMapping.definition.map[0].includeMax,
                }
              }

              if (
                cxMapping.definition.map[numMapEntries - 1].min != null &&
                cxMapping.definition.map[numMapEntries - 1].minVPValue != null
              ) {
                max = {
                  value: cxMapping.definition.map[numMapEntries - 1]
                    .min as ValueType,
                  vpValue: converter.valueConverter(
                    cxMapping.definition.map[numMapEntries - 1]
                      .minVPValue as CXVisualPropertyValue,
                  ),
                  inclusive:
                    cxMapping.definition.map[numMapEntries - 1].includeMin,
                }
              }

              const controlPoints: ContinuousFunctionControlPoint[] = []

              // only iterate through the middle entries of the map
              // i.e. exclue min and max
              for (let i = 1; i <= numMapEntries - 2; i++) {
                const mapEntry = cxMapping.definition.map[i]
                if (mapEntry.minVPValue != null && mapEntry.min != null) {
                  controlPoints.push({
                    value: mapEntry.min as ValueType,
                    vpValue: converter.valueConverter(mapEntry.minVPValue),
                  })
                }

                if (mapEntry.maxVPValue != null && mapEntry.max != null) {
                  controlPoints.push({
                    value: mapEntry.max as ValueType,
                    vpValue: converter.valueConverter(mapEntry.maxVPValue),
                  })
                }
              }

              const uniqueCtrlPts = _.uniqWith(controlPoints, _.isEqual)

              const sortedCtrlPts = Array.from(uniqueCtrlPts).sort(
                (a, b) => (a.value as number) - (b.value as number),
              )

              if (min != null && max != null && controlPoints.length > 0) {
                const m: ContinuousMappingFunction = {
                  type: 'continuous',
                  attribute: cxMapping.definition.attribute,
                  min,
                  max,
                  controlPoints: sortedCtrlPts,
                }
                visualStyle[vpName].mapping = m
              } else {
                visualStyle[vpName].mapping = null
              }
              break
            }
            default:
              break
          }
        }

        visualStyle[vpName].bypassMap = cxBypass.get(vpName) ?? new Map()
      } else {
        // property is not found in cx, in theory all cytoscape web properties should be in
        // cx, if this happens, it is a bug
        console.error(`Property ${vpName} not found in CX`)
      }
    })

    // some cx properties are probably not handled in this conversion,
    // we should find a way to store them and then restore them when we round trip
  })

  return visualStyle
}

export const createCyJsStyleSheetView = (
  vs: VisualStyle,
  network: Network,
  nodeTable: Table,
  edgeTable: Table,
  networkView: NetworkView,
): {
  defaultStyle: Stylesheet[]
  cyNodes: ElementDefinition[]
  cyEdges: ElementDefinition[]
  nodeBypasses: Record<IdType, Partial<Record<string, VisualPropertyValueType>>>
  edgeBypasses: Record<IdType, Partial<Record<string, VisualPropertyValueType>>>
} => {
  // edge ids are of the form 'e1', 'e2', etc. but our app stores them as '1', '2', etc.
  const nodeStyle: Record<
    string,
    VisualPropertyValueType | ((node: NodeSingular) => VisualPropertyValueType)
  > = {}
  const edgeStyle: Record<
    string,
    VisualPropertyValueType | ((edge: EdgeSingular) => VisualPropertyValueType)
  > = {}

  const nodeBypasses: Record<
    IdType,
    Partial<Record<string, VisualPropertyValueType>>
  > = {}
  const edgeBypasses: Record<
    IdType,
    Partial<Record<string, VisualPropertyValueType>>
  > = {}

  nodeVisualProperties(vs).forEach(
    (vp: VisualProperty<VisualPropertyValueType>) => {
      const defaultValue = vp.defaultValue
      const mapping = vp.mapping
      const bypassMap = vp.bypassMap
      const cyStyleName = cyJsVisualPropertyConverter[vp.name]?.cyJsVPName

      if (cyStyleName != null) {
        nodeStyle[cyStyleName] = defaultValue

        if (mapping != null) {
          nodeStyle[cyStyleName] = createCyJsMappingFn(
            mapping,
            nodeTable,
            defaultValue,
          )
        }

        if (bypassMap != null) {
          Array.from(bypassMap.entries()).forEach(([cxNodeId, bypassValue]) => {
            if (nodeBypasses[cxNodeId] != null) {
              nodeBypasses[cxNodeId][cyStyleName] = bypassValue
            } else {
              nodeBypasses[cxNodeId] = {
                [cyStyleName]: bypassValue,
              }
            }
          })
        }
      }
    },
  )
  // default label mapping function (TODO this depends on many assumptions, revist this later)
  // if there is no default label mapping function defined, define a default label mapping function
  // looking for the attributes 'n' or 'name'
  nodeStyle.label =
    nodeStyle.label === ''
      ? (nodeStyle.label = (node: NodeSingular): string => {
          const nodeId = node.data('id')
          const nodeAttrs = nodeTable.rows.get(nodeId)
          const name: string =
            (nodeAttrs?.n as string) ?? (nodeAttrs?.name as string) ?? ''
          return name
        })
      : nodeStyle.label

  nodeStyle['min-zoomed-font-size'] = 14

  edgeVisualProperties(vs).forEach(
    (vp: VisualProperty<VisualPropertyValueType>) => {
      const defaultValue = vp.defaultValue
      const mapping = vp.mapping
      const bypassMap = vp.bypassMap
      const cyStyleName = cyJsVisualPropertyConverter[vp.name]?.cyJsVPName

      if (cyStyleName != null) {
        edgeStyle[cyStyleName] = defaultValue
        if (mapping != null) {
          edgeStyle[cyStyleName] = createCyJsMappingFn(
            mapping,
            edgeTable,
            defaultValue,
          )
        }

        if (bypassMap != null) {
          Array.from(bypassMap.entries()).forEach(([cxEdgeId, bypassValue]) => {
            if (edgeBypasses[cxEdgeId] != null) {
              edgeBypasses[cxEdgeId][cyStyleName] = bypassValue
            } else {
              edgeBypasses[cxEdgeId] = {
                [cyStyleName]: bypassValue,
              }
            }
          })
        }
      }
    },
  )
  edgeStyle['min-zoomed-font-size'] = 14
  edgeStyle['curve-style'] = 'bezier'

  if (edgeStyle.autorotate === true) {
    delete edgeStyle.autorotate
    edgeStyle['text-rotation'] = 'autorotate'
  }

  const defaultStyle = [
    {
      selector: 'node',
      style: nodeStyle,
    },
    {
      selector: 'edge',
      style: edgeStyle,
    },
    {
      selector: ':selected',
      style: {
        'underlay-color': 'blue',
        'underlay-padding': 5,
        'underlay-opacity': 0.5,
      },
    },
    {
      selector: '.hovered',
      style: {
        'underlay-color': 'red',
        'underlay-padding': 10,
        'underlay-opacity': 0.8,
        'z-index': 1,
      },
    },
  ]
  const cyNodes = network.nodes.map((node) => {
    const positionX = networkView.nodeViews[node.id]?.x ?? 0
    const positionY = networkView.nodeViews[node.id]?.y ?? 0
    const selected = networkView.nodeViews[node.id].selected ?? false

    return {
      group: 'nodes' as ElementGroup,
      data: {
        id: node.id,
      },
      position: {
        x: positionX,
        y: positionY,
      },
      selected,
    }
  })

  const cyEdges = network.edges.map((edge) => {
    const cyEdge = {
      group: 'edges' as ElementGroup,
      data: {
        id: edge.id,
        source: edge.s,
        target: edge.t,
      },
      selected: networkView.edgeViews[edge.id].selected ?? false,
    }

    return cyEdge
  })

  return {
    defaultStyle,
    cyNodes,
    cyEdges,
    nodeBypasses,
    edgeBypasses,
  }
}
