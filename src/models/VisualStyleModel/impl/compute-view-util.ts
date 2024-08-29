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
  NodeLabelPositionType,
  EdgeFillType,
  EdgeArrowShapeType,
} from '..'

import * as VisualStyleFnImpl from './VisualStyleFnImpl'
import * as MapperFactory from './MapperFactory'
import { SpecialPropertyName } from './CyjsProperties/CyjsStyleModels/DirectMappingSelector'
import { isOpenShape, openShapeToFilledShape } from './EdgeArrowShapeImpl'
import { translateEdgeIdToCX } from '../../NetworkModel/impl/CyNetwork'
import { computeNodeLabelPosition } from './nodeLabelPositionMap'

// Build mapping functions from all visual properties
const buildMappers = (vs: VisualStyle): Map<VisualPropertyName, Mapper> => {
  const mappers: Map<VisualPropertyName, Mapper> = new Map()
  const vpNames: VisualPropertyName[] = Object.keys(vs) as VisualPropertyName[]
  vpNames.forEach((vpName: VisualPropertyName) => {
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

  const nodeViewCount = Object.keys(nodeViews).length
  const nodeCount = network.nodes.length
  if (nodeViewCount !== nodeCount) {
    console.error(
      '## nodeViews.length !== network.nodes.length',
      nodeCount,
      nodeViewCount,
    )
  }

  const nextView: NetworkView = {
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
    selectedNodes: networkView.selectedNodes,
    selectedEdges: networkView.selectedEdges,
  }

  return nextView
}

const nodeViewBuilder = (
  nodes: Node[],
  visualProps: Array<VisualProperty<VisualPropertyValueType>>,
  mappers: Map<VisualPropertyName, Mapper>,
  nodeTable: Table,
  nodeViews?: Record<IdType, NodeView>,
): Record<IdType, NodeView> => {
  const result: Record<IdType, NodeView> = {}
  const columns: Column[] = nodeTable.columns
  let idx: number = nodes.length
  if (idx !== nodes.length) {
    console.error(
      '# of nodes does not match to the # of node views:',
      idx,
      nodeViews,
    )
  }
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  while (idx--) {
    const node = nodes[idx]
    const nodeId = node.id
    const nodeView: NodeView | undefined =
      nodeViews !== undefined ? nodeViews[nodeId] : undefined

    if (nodeView === undefined) {
      console.error('@@nodeView is undefined. This might break the view.')
    }

    const nv: NodeView = {
      id: nodeId,
      values: computeView(
        node.id,
        visualProps,
        mappers,
        nodeTable.rows.get(nodeId) ?? {},
        columns,
      ),
      x: nodeView !== undefined ? nodeView.x : 0,
      y: nodeView !== undefined ? nodeView.y : 0,
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
  const columns: Column[] = edgeTable.columns
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

const computeNameAndPropertyPairs = (
  vpName: VisualPropertyName,
  value: VisualPropertyValueType,
): [string, VisualPropertyValueType][] => {
  if (vpName === VisualPropertyName.NodeLabelPosition) {
    const computedPosition = computeNodeLabelPosition(
      value as NodeLabelPositionType,
    )

    return [
      [
        SpecialPropertyName.NodeLabelHorizontalAlign,
        computedPosition.horizontalAlign,
      ],
      [
        SpecialPropertyName.NodeLabelVerticalAlign,
        computedPosition.verticalAlign,
      ],
    ]
  }
  if (
    vpName === VisualPropertyName.EdgeSourceArrowShape ||
    vpName === VisualPropertyName.EdgeTargetArrowShape
  ) {
    const fillPos =
      vpName === VisualPropertyName.EdgeSourceArrowShape
        ? SpecialPropertyName.SourceArrowFill
        : SpecialPropertyName.TargetArrowFill

    return [
      [
        fillPos,
        isOpenShape(value as EdgeArrowShapeType)
          ? EdgeFillType.Hollow
          : EdgeFillType.Filled,
      ],
      [
        vpName,
        isOpenShape(value as EdgeArrowShapeType)
          ? openShapeToFilledShape(value as EdgeArrowShapeType)
          : value,
      ],
    ]
  } else {
    return [[vpName, value]]
  }
}

const computeView = (
  id: IdType,
  visualProperties: Array<VisualProperty<VisualPropertyValueType>>,
  mappers: Map<AttributeName, Mapper>,
  row: Record<AttributeName, ValueType>,
  columns: Column[],
): Map<VisualPropertyName, VisualPropertyValueType> => {
  const pairs = new Map<VisualPropertyName, VisualPropertyValueType>()

  visualProperties.forEach((vp: VisualProperty<VisualPropertyValueType>) => {
    const { defaultValue, mapping, bypassMap, name, group } = vp
    const bypassId = group === 'node' ? id : translateEdgeIdToCX(id)
    const bypass = bypassMap.get(bypassId)
    let pairsToAdd: [string, VisualPropertyValueType][] = []
    if (bypass !== undefined) {
      pairsToAdd = computeNameAndPropertyPairs(vp.name, bypass)
    } else if (mapping !== undefined) {
      // Mapping is available.
      // TODO: compute mapping
      const attrName: string = mapping.attribute
      const attributeValueAssigned: ValueType | undefined = row[attrName]

      if (attributeValueAssigned !== undefined) {
        const mapper: Mapper | undefined = mappers.get(vp.name)
        if (mapper === undefined) {
          throw new Error(
            `Mapping is defined, but Mapper for ${vp.name} is not found`,
          )
        }
        const computedValue: VisualPropertyValueType = mapper(
          attributeValueAssigned,
        )
        pairsToAdd = computeNameAndPropertyPairs(vp.name, computedValue)
      } else {
        pairsToAdd = computeNameAndPropertyPairs(vp.name, defaultValue)
      }
    } else {
      pairsToAdd = computeNameAndPropertyPairs(vp.name, defaultValue)
    }

    pairsToAdd.forEach(([computedName, computedValue]) => {
      pairs.set(computedName as VisualPropertyName, computedValue)
    })
  })

  return pairs
}
