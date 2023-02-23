import { IdType } from '../../IdType'
import { Edge, Network, Node } from '../../NetworkModel'
import { AttributeName, Column, Table, ValueType } from '../../TableModel'
import { EdgeView, NetworkView, NodeView } from '../../ViewModel'
import {
  ContinuousMappingFunction,
  DiscreteMappingFunction,
  MappingFunctionType,
  PassthroughMappingFunction,
  VisualMappingFunction,
  VisualProperty,
  VisualPropertyName,
  VisualPropertyValueType,
  VisualStyle,
  Mapper,
} from '..'

import * as VisualStyleFnImpl from './VisualStyleFnImpl'
import * as MapperFactory from './MapperFactory'

// Build mapping functions from all visual properties
const buildMappers = (vs: VisualStyle): Map<VisualPropertyName, Mapper> => {
  const mappers: Map<VisualPropertyName, Mapper> = new Map()
  Object.keys(vs).forEach((vpName: VisualPropertyName) => {
    const vp: VisualProperty<VisualPropertyValueType> = vs[vpName]
    const vmf: VisualMappingFunction | undefined = vp.mapping
    if (vmf !== undefined) {
      let mapper: Mapper
      const mappingType: MappingFunctionType = vmf.type
      if (mappingType === MappingFunctionType.Discrete) {
        mapper = MapperFactory.createDiscreteMapper(
          vmf as DiscreteMappingFunction,
        )
      } else if (mappingType === MappingFunctionType.Continuous) {
        mapper = MapperFactory.createContinuousMapper(
          vmf as ContinuousMappingFunction,
        )
      } else if (mappingType === MappingFunctionType.Passthrough) {
        mapper = MapperFactory.createPassthroughMapper(
          vmf as PassthroughMappingFunction,
        )
      } else {
        throw new Error(`Unknown mapping type for ${vpName}`)
      }

      if (mapper !== undefined) {
        mappers.set(vpName, mapper)
      }
    }
  })
  return mappers
}

/**
 *
 * Utility function to create new network view
 *
 * @param network Network data to be used to create view model
 * @returns NetworkView network view model
 */
export const createNewNetworkView = (
  network: Network,
  vs: VisualStyle,
  nodeTable: Table,
  edgeTable: Table,
): NetworkView => {
  const mappers = buildMappers(vs)
  return {
    id: network.id,
    values: new Map<VisualPropertyName, VisualPropertyValueType>(),
    nodeViews: nodeViewBuilder(
      network.nodes,
      VisualStyleFnImpl.nodeVisualProperties(vs),
      mappers,
      nodeTable,
    ),
    edgeViews: edgeViewBuilder(
      network.edges,
      VisualStyleFnImpl.edgeVisualProperties(vs),
      mappers,
      edgeTable,
    ),
    selectedNodes: [],
    selectedEdges: [],
  }
}
export const updateNetworkView = (
  network: Network,
  networkView: NetworkView,
  vs: VisualStyle,
  nodeTable: Table,
  edgeTable: Table,
): NetworkView => {
  // Extract positions from the existing network view
  const { nodeViews } = networkView
  const mappers = buildMappers(vs)

  return {
    id: network.id,
    values: new Map<VisualPropertyName, VisualPropertyValueType>(),
    nodeViews: nodeViewBuilder(
      network.nodes,
      VisualStyleFnImpl.nodeVisualProperties(vs),
      mappers,
      nodeTable,
      nodeViews,
    ),
    edgeViews: edgeViewBuilder(
      network.edges,
      VisualStyleFnImpl.edgeVisualProperties(vs),
      mappers,
      edgeTable,
    ),
    selectedNodes: [],
    selectedEdges: [],
  }
}

const nodeViewBuilder = (
  nodes: Node[],
  visualProps: Array<VisualProperty<VisualPropertyValueType>>,
  mappers: Map<VisualPropertyName, Mapper>,
  nodeTable: Table,
  nodeViews?: Record<IdType, NodeView>,
): Record<IdType, NodeView> => {
  const result: Record<IdType, NodeView> = {}
  const columns: Map<AttributeName, Column> = nodeTable.columns
  let idx: number = nodes.length
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  while (idx--) {
    const node = nodes[idx]
    const nv: NodeView = {
      id: node.id,
      values: computeView(
        node.id,
        visualProps,
        mappers,
        nodeTable.rows.get(node.id) ?? {},
        columns,
      ),
      x: nodeViews !== undefined ? nodeViews[node.id].x : 0,
      y: nodeViews !== undefined ? nodeViews[node.id].y : 0,
    }
    result[nv.id] = nv
  }
  return result
}

const edgeViewBuilder = (
  edges: Edge[],
  visualProps: Array<VisualProperty<VisualPropertyValueType>>,
  mappers: Map<VisualPropertyName, Mapper>,
  edgeTable: Table,
): Record<IdType, EdgeView> => {
  const result: Record<IdType, EdgeView> = {}
  const columns: Map<AttributeName, Column> = edgeTable.columns
  let idx: number = edges.length
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  while (idx--) {
    const edge = edges[idx]
    const ev: EdgeView = {
      id: edge.id,
      values: computeView(
        edge.id,
        visualProps,
        mappers,
        edgeTable.rows.get(edge.id) ?? {},
        columns,
      ),
    }
    result[ev.id] = ev
  }
  return result
}

const computeView = (
  id: IdType,
  visualProperties: Array<VisualProperty<VisualPropertyValueType>>,
  mappers: Map<AttributeName, Mapper>,
  row: Record<AttributeName, ValueType>,
  columns: Map<AttributeName, Column>,
): Map<VisualPropertyName, VisualPropertyValueType> => {
  const pairs = new Map<VisualPropertyName, VisualPropertyValueType>()

  visualProperties.forEach((vp: VisualProperty<VisualPropertyValueType>) => {
    const { defaultValue, mapping, bypassMap, name } = vp
    const bypass = bypassMap.get(id)
    if (bypass !== undefined) {
      // Bypass is available. Use it
      pairs.set(name, bypass)
    } else if (mapping !== undefined) {
      // Mapping is available.
      // TODO: compute mapping
      const attrName: string = mapping.attribute
      const attributeValueAssigned: ValueType | undefined = row[attrName]

      if (attributeValueAssigned !== undefined) {
        // const computedValue: VisualPropertyValueType = getMappedValue(
        //   mapping,
        //   attributeValueAssigned,
        //   columns,
        //   vp.type,
        //   vp.defaultValue,
        //   mapper.get(vp.name),
        // )
        const mapper: Mapper | undefined = mappers.get(vp.name)
        if (mapper === undefined) {
          throw new Error(
            `Mapping is defined, but Mapper for ${vp.name} is not found`,
          )
        }
        const computedValue: VisualPropertyValueType = mapper(
          attributeValueAssigned,
        )
        pairs.set(name, computedValue)
      } else {
        pairs.set(name, defaultValue)
      }
    } else {
      pairs.set(name, defaultValue)
    }
  })

  return pairs
}
