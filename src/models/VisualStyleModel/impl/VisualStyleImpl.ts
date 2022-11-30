import chroma, { Color } from 'chroma-js'
import { Cx2 } from '../../../utils/cx/Cx2'
import * as cxUtil from '../../../utils/cx/cx2-util'
import { Network } from '../../NetworkModel'
import { Table } from '../../TableModel'
import { CyJsEdgeView, CyJsNodeView, CyJsNetworkView } from '../../ViewModel'
import {
  DiscreteMappingFunction,
  ContinuousMappingFunction,
} from '../VisualMappingFunction'
import { ContinuousFunctionInterval } from '../VisualMappingFunction/ContinuousMappingFunction'
import { VisualPropertyName } from '../VisualPropertyName'

import { VisualStyleChangeSet } from '../VisualStyleFn'
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

export const nodeVisualProperties = (
  visualStyle: VisualStyle,
): VisualPropertyName[] => {
  return Object.keys(visualStyle).filter((key) =>
    key.startsWith('node'),
  ) as VisualPropertyName[]
}

export const edgeVisualProperties = (
  visualStyle: VisualStyle,
): VisualPropertyName[] => {
  return Object.keys(visualStyle).filter((key) =>
    key.startsWith('edge'),
  ) as VisualPropertyName[]
}

export const networkVisualProperties = (
  visualStyle: VisualStyle,
): VisualPropertyName[] => {
  return Object.keys(visualStyle).filter((key) =>
    key.startsWith('network'),
  ) as VisualPropertyName[]
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
              const m: ContinuousMappingFunction = {
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

                  return convertedInterval as ContinuousFunctionInterval
                }),
              }
              visualStyle[vpName].mapping = m
              break
            }
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
): VisualStyle => {
  return { ...visualStyle, ...changeSet }
}

export const createCyJsView = (
  vs: VisualStyle,
  network: Network,
  nodeTable: Table,
  edgeTable: Table,
): CyJsNetworkView => {
  const cyNodeViews = network.nodes.map((node): CyJsNodeView => {
    const positionX = nodeTable.rows.get(node.id)?.positionX ?? 0
    const positionY = nodeTable.rows.get(node.id)?.positionY ?? 0
    const nodeAttrs = nodeTable.rows.get(node.id)
    const name = (nodeAttrs?.n ??
      nodeAttrs?.name ??
      '') as VisualPropertyValueType

    const cyStyle: Record<string, VisualPropertyValueType> = {}

    nodeVisualProperties(vs).forEach((vpName: VisualPropertyName) => {
      const vp = vs[vpName] as VisualProperty<VisualPropertyValueType>
      const vpValue = vp.bypassMap?.[node.id] ?? vp.defaultValue
      const cyStyleName = cyJsVisualPropertyConverter[vpName]?.cyJsVPName

      if (cyStyleName != null) {
        cyStyle[cyStyleName] = vpValue
      }
    })

    cyStyle.label = name

    const cyNodeView = {
      group: 'nodes',
      data: {
        id: node.id,
      },
      position: {
        x: positionX as number,
        y: positionY as number,
      },
      style: cyStyle,
    }

    return cyNodeView
  })

  const cyEdgeViews = network.edges.map((edge): CyJsEdgeView => {
    const cyStyle: Record<string, VisualPropertyValueType> = {}

    edgeVisualProperties(vs).forEach((vpName: VisualPropertyName) => {
      const vp = vs[vpName] as VisualProperty<VisualPropertyValueType>
      const vpValue = vp.bypassMap?.[edge.id] ?? vp.defaultValue
      const cyStyleName = cyJsVisualPropertyConverter[vpName]?.cyJsVPName

      if (cyStyleName != null) {
        cyStyle[cyStyleName] = vpValue
      }
    })

    if (cyStyle.autorotate === true) {
      delete cyStyle.autorotate
      cyStyle['text-rotation'] = 'autorotate'
    }

    const cyEdge = {
      group: 'edges',
      data: {
        id: edge.id,
        source: edge.s,
        target: edge.t,
      },
      style: cyStyle,
    }

    return cyEdge
  })

  const networkView = {
    id: network.id,
    nodeViews: cyNodeViews,
    edgeViews: cyEdgeViews,
  }

  return networkView
}

export const createCyJsStyleSheetView = (
  vs: VisualStyle,
  network: Network,
  nodeTable: Table,
  edgeTable: Table,
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

  nodeVisualProperties(vs).forEach((vpName: VisualPropertyName) => {
    const vp = vs[vpName] as VisualProperty<VisualPropertyValueType>
    const defaultValue = vp.defaultValue
    const mapping = vp.mapping
    const bypassMap = vp.bypassMap
    const cyStyleName = cyJsVisualPropertyConverter[vpName]?.cyJsVPName

    if (cyStyleName != null) {
      nodeStyle[cyStyleName] = defaultValue

      if (mapping != null) {
        switch (mapping.type) {
          case 'passthrough': {
            const { attribute } = mapping
            nodeStyle[cyStyleName] = (
              node: NodeSingular,
            ): VisualPropertyValueType => {
              const row = nodeTable.rows.get(node.data('id'))
              const column = nodeTable.columns.get(attribute)
              const value =
                (column?.alias != null
                  ? row?.[column.alias]
                  : row?.[attribute]) ?? column?.defaultValue

              if (!Array.isArray(value) && value != null) {
                return value
              }
              throw new Error(
                `Error applying passthrough mapping function on node ${
                  node.data('id') as string
                }.  Value: ${String(
                  value,
                )} should not be an array or undefined`,
              )
            }
            break
          }
          case 'discrete': {
            const { attribute } = mapping
            const m = mapping as DiscreteMappingFunction
            nodeStyle[cyStyleName] = (
              node: NodeSingular,
            ): VisualPropertyValueType => {
              const row = nodeTable.rows.get(node.data('id'))
              const column = nodeTable.columns.get(attribute)
              const value =
                (column?.alias != null
                  ? row?.[column.alias]
                  : row?.[attribute]) ?? column?.defaultValue

              if (!Array.isArray(value) && value != null) {
                return m.vpValueMap.get(value) ?? defaultValue
              }

              throw new Error(
                `Error applying discrete mapping function on node ${
                  node.data('id') as string
                }.  Value: ${String(
                  value,
                )} should not be an array or undefined`,
              )
            }
            break
          }
          case 'continuous': {
            const { attribute } = mapping
            const m = mapping as ContinuousMappingFunction
            nodeStyle[cyStyleName] = (
              node: NodeSingular,
            ): VisualPropertyValueType => {
              const row = nodeTable.rows.get(node.data('id'))
              const column = nodeTable.columns.get(attribute)
              const value =
                (column?.alias != null
                  ? row?.[column.alias]
                  : row?.[attribute]) ?? column?.defaultValue

              if (
                !Array.isArray(value) &&
                value != null &&
                Number.isFinite(value)
              ) {
                // find the first interval that the value is in

                for (let i = 0; i < m.intervals.length; i++) {
                  const {
                    min,
                    max,
                    minVPValue,
                    maxVPValue,
                    includeMax,
                    includeMin,
                  } = m.intervals[i]

                  const minOnly = min != null && max == null
                  const maxOnly = max != null && min == null
                  const isInterval = max != null && min != null

                  if (minOnly) {
                    const valueGreaterThanEqual =
                      includeMin && min <= value && minVPValue != null
                    const valueGreaterThan =
                      !includeMin && min < value && minVPValue != null

                    if (valueGreaterThan || valueGreaterThanEqual) {
                      return minVPValue
                    }
                  }

                  if (maxOnly) {
                    const valueLessThanEqual =
                      includeMax && max >= value && maxVPValue != null
                    const valueLessThan =
                      !includeMax && max > value && maxVPValue != null
                    if (valueLessThan || valueLessThanEqual) {
                      return maxVPValue
                    }
                  }

                  if (isInterval) {
                    const valueIsContained =
                      (includeMax &&
                        max >= value &&
                        includeMin &&
                        min <= value) ||
                      (!includeMax &&
                        max > value &&
                        includeMin &&
                        min <= value) ||
                      (includeMax &&
                        max >= value &&
                        !includeMin &&
                        min < value) ||
                      (!includeMax && max > value && !includeMin && min < value)

                    if (valueIsContained) {
                      // map linear number/color
                      const vpsAreColors =
                        maxVPValue != null &&
                        minVPValue != null &&
                        chroma.valid(maxVPValue) &&
                        chroma.valid(minVPValue)

                      const vpsAreNumbers =
                        maxVPValue != null &&
                        minVPValue != null &&
                        Number.isFinite(maxVPValue) &&
                        Number.isFinite(minVPValue)

                      if (vpsAreColors) {
                        // map color
                        const colorMapper = chroma
                          .scale([
                            minVPValue as unknown as Color,
                            maxVPValue as unknown as Color,
                          ])
                          .domain([
                            min as unknown as number,
                            max as unknown as number,
                          ])
                        return colorMapper(
                          value as unknown as number,
                        ) as unknown as VisualPropertyValueType
                      }

                      if (vpsAreNumbers) {
                        // map number
                        // export const mapLinearNumber = (
                        //   value: number,
                        //   min: number,
                        //   max: number,
                        //   styleMin: number,
                        //   styleMax: number,
                        // ): number => {
                        //   const t = (value - min) / (max - min)
                        //   return styleMin + t * (styleMax - styleMin)
                        // }
                        // map linear numbers
                        const v = value as number
                        const minV = min as number
                        const maxV = max as number
                        const minVP = minVPValue as number
                        const maxVP = maxVPValue as number
                        const t = (v - minV) / (maxV - minV)
                        return minVP + t * (maxVP - minVP)
                      }
                    }
                  }
                }
              }
              throw new Error(
                `Error applying continuous mapping function on node ${
                  node.data('id') as string
                }.  Value: ${String(
                  value,
                )} should be a number, minVP, maxVP should be numbers or colors, min and max should be colors`,
              )
            }
            break
          }
        }
      }

      if (bypassMap != null) {
        Object.entries(bypassMap).forEach(([cxNodeId, bypassValue]) => {
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
  })
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

  const getEdgeId = (edge: EdgeSingular): string => edge.data('id').slice(1)

  edgeVisualProperties(vs).forEach((vpName: VisualPropertyName) => {
    const vp = vs[vpName] as VisualProperty<VisualPropertyValueType>
    const defaultValue = vp.defaultValue
    const mapping = vp.mapping
    const bypassMap = vp.bypassMap
    const cyStyleName = cyJsVisualPropertyConverter[vpName]?.cyJsVPName

    if (cyStyleName != null) {
      edgeStyle[cyStyleName] = defaultValue
      if (mapping != null) {
        switch (mapping.type) {
          case 'passthrough': {
            const { attribute } = mapping
            edgeStyle[cyStyleName] = function (
              edge: EdgeSingular,
            ): VisualPropertyValueType {
              const row = edgeTable.rows.get(getEdgeId(edge))
              const column = edgeTable.columns.get(attribute)
              const value =
                (column?.alias != null
                  ? row?.[column.alias]
                  : row?.[attribute]) ?? column?.defaultValue

              if (!Array.isArray(value) && value != null) {
                return value
              }
              throw new Error(
                `Error applying passthrough mapping function on edge ${getEdgeId(
                  edge,
                )}.  Value: ${String(
                  value,
                )} should not be an array or undefined`,
              )
            }

            break
          }
          case 'discrete': {
            const { attribute } = mapping
            const m = mapping as DiscreteMappingFunction
            edgeStyle[cyStyleName] = function (
              edge: EdgeSingular,
            ): VisualPropertyValueType {
              const row = edgeTable.rows.get(getEdgeId(edge))
              const column = edgeTable.columns.get(attribute)
              const value =
                (column?.alias != null
                  ? row?.[column.alias]
                  : row?.[attribute]) ?? column?.defaultValue

              if (!Array.isArray(value) && value != null) {
                return m.vpValueMap.get(value) ?? defaultValue
              }

              throw new Error(
                `Error applying discrete mapping function on edge ${getEdgeId(
                  edge,
                )}.  Value: ${String(
                  value,
                )} should not be an array or undefined`,
              )
            }

            break
          }
          case 'continuous': {
            const { attribute } = mapping
            const m = mapping as ContinuousMappingFunction
            edgeStyle[cyStyleName] = function (
              edge: EdgeSingular,
            ): VisualPropertyValueType {
              const row = edgeTable.rows.get(`${Number(getEdgeId(edge))}`)
              const column = edgeTable.columns.get(attribute)
              const value =
                (column?.alias != null
                  ? row?.[column.alias]
                  : row?.[attribute]) ?? column?.defaultValue

              if (
                !Array.isArray(value) &&
                value != null &&
                Number.isFinite(value)
              ) {
                // find the first interval that the value is in

                for (let i = 0; i < m.intervals.length; i++) {
                  const {
                    min,
                    max,
                    minVPValue,
                    maxVPValue,
                    includeMax,
                    includeMin,
                  } = m.intervals[i]

                  const minOnly = min != null && max == null
                  const maxOnly = max != null && min == null
                  const isInterval = max != null && min != null

                  if (minOnly) {
                    const valueGreaterThanEqual =
                      includeMin && min <= value && minVPValue != null
                    const valueGreaterThan =
                      !includeMin && min < value && minVPValue != null

                    if (valueGreaterThan || valueGreaterThanEqual) {
                      return minVPValue
                    }
                  }

                  if (maxOnly) {
                    const valueLessThanEqual =
                      includeMax && max >= value && maxVPValue != null
                    const valueLessThan =
                      !includeMax && max > value && maxVPValue != null
                    if (valueLessThan || valueLessThanEqual) {
                      return maxVPValue
                    }
                  }

                  if (isInterval) {
                    const valueIsContained =
                      (includeMax &&
                        max >= value &&
                        includeMin &&
                        min <= value) ||
                      (!includeMax &&
                        max > value &&
                        includeMin &&
                        min <= value) ||
                      (includeMax &&
                        max >= value &&
                        !includeMin &&
                        min < value) ||
                      (!includeMax && max > value && !includeMin && min < value)

                    if (valueIsContained) {
                      // map linear number/color
                      const vpsAreColors =
                        maxVPValue != null &&
                        minVPValue != null &&
                        chroma.valid(maxVPValue, 'hex') &&
                        chroma.valid(minVPValue, 'hex')

                      const vpsAreNumbers =
                        maxVPValue != null &&
                        minVPValue != null &&
                        Number.isFinite(maxVPValue) &&
                        Number.isFinite(minVPValue)

                      if (vpsAreColors) {
                        // map color
                        const colorMapper = chroma
                          .scale([
                            minVPValue as unknown as Color,
                            maxVPValue as unknown as Color,
                          ])
                          .domain([
                            min as unknown as number,
                            max as unknown as number,
                          ])
                        return colorMapper(
                          value as unknown as number,
                        ).hex() as VisualPropertyValueType
                      }

                      if (vpsAreNumbers) {
                        // map number
                        // export const mapLinearNumber = (
                        //   value: number,
                        //   min: number,
                        //   max: number,
                        //   styleMin: number,
                        //   styleMax: number,
                        // ): number => {
                        //   const t = (value - min) / (max - min)
                        //   return styleMin + t * (styleMax - styleMin)
                        // }
                        // map linear numbers
                        const v = value as number
                        const minV = min as number
                        const maxV = max as number
                        const minVP = minVPValue as number
                        const maxVP = maxVPValue as number
                        const t = (v - minV) / (maxV - minV)

                        return minVP + t * (maxVP - minVP)
                      }
                    }
                  }
                }
              }
              throw new Error(
                `Error applying continuous mapping function on edge ${getEdgeId(
                  edge,
                )}.  Value: ${String(
                  value,
                )} should be a number, minVP, maxVP should be numbers or colors, min and max should be colors`,
              )
            }
            break
          }
        }
      }

      if (bypassMap != null) {
        Object.entries(bypassMap).forEach(([cxEdgeId, bypassValue]) => {
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
  })
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
  ]
  const cyNodes = network.nodes.map((node) => {
    const positionX = nodeTable.rows.get(node.id)?.positionX ?? 0
    const positionY = nodeTable.rows.get(node.id)?.positionY ?? 0
    return {
      group: 'nodes' as ElementGroup,
      data: {
        id: node.id,
      },
      position: {
        x: positionX as number,
        y: positionY as number,
      },
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
