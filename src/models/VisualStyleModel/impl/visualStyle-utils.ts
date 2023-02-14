import { IdType } from '../../IdType'
import { Edge, Network, Node } from '../../NetworkModel'
import { AttributeName, Table, ValueType } from '../../TableModel'
import { EdgeView, NetworkView, NodeView } from '../../ViewModel'
import {
  ContinuousMappingFunction,
  DiscreteMappingFunction,
  MappingFunctionType,
  VisualMappingFunction,
} from '../VisualMappingFunction'
import { VisualProperty } from '../VisualProperty'
import { VisualPropertyName } from '../VisualPropertyName'
import { VisualPropertyValueType } from '../VisualPropertyValue'
import { VisualStyle } from '../VisualStyle'
import { edgeVisualProperties, nodeVisualProperties } from './VisualStyleImpl'

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
): NetworkView => ({
  id: network.id,
  values: new Map<VisualPropertyName, VisualPropertyValueType>(),
  nodeViews: nodeViewBuilder(
    network.nodes,
    nodeVisualProperties(vs),
    nodeTable,
  ),
  edgeViews: edgeViewBuilder(
    network.edges,
    edgeVisualProperties(vs),
    edgeTable,
  ),
  selectedNodes: [],
  selectedEdges: [],
})

export const updateNetworkView = (
  network: Network,
  networkView: NetworkView,
  vs: VisualStyle,
  nodeTable: Table,
  edgeTable: Table,
): NetworkView => {
  // Extract positions from the existing network view
  const { nodeViews } = networkView

  return {
    id: network.id,
    values: new Map<VisualPropertyName, VisualPropertyValueType>(),
    nodeViews: nodeViewBuilder(
      network.nodes,
      nodeVisualProperties(vs),
      nodeTable,
      nodeViews,
    ),
    edgeViews: edgeViewBuilder(
      network.edges,
      edgeVisualProperties(vs),
      edgeTable,
    ),
    selectedNodes: [],
    selectedEdges: [],
  }
}

const nodeViewBuilder = (
  nodes: Node[],
  visualProps: Array<VisualProperty<VisualPropertyValueType>>,
  nodeTable: Table,
  nodeViews?: Record<IdType, NodeView>,
): Record<IdType, NodeView> => {
  const t1 = performance.now()

  const result: Record<IdType, NodeView> = {}
  let idx: number = nodes.length
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  while (idx--) {
    const node = nodes[idx]
    const nv: NodeView = {
      id: node.id,
      values: computeView(
        node.id,
        visualProps,
        nodeTable.rows.get(node.id) ?? {},
      ),
      x: nodeViews !== undefined ? nodeViews[node.id].x : 0,
      y: nodeViews !== undefined ? nodeViews[node.id].y : 0,
    }
    result[nv.id] = nv
  }

  const t2 = performance.now()
  console.log(`##### nodeViewBuilder took ${t2 - t1} milliseconds.`)
  return result
}

const edgeViewBuilder = (
  edges: Edge[],
  visualProps: Array<VisualProperty<VisualPropertyValueType>>,
  edgeTable: Table,
): Record<IdType, EdgeView> => {
  const t1 = performance.now()

  const result: Record<IdType, EdgeView> = {}
  let idx: number = edges.length
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  while (idx--) {
    const edge = edges[idx]
    const ev: EdgeView = {
      id: edge.id,
      values: computeView(
        edge.id,
        visualProps,
        edgeTable.rows.get(edge.id) ?? {},
      ),
    }
    result[ev.id] = ev
  }

  const t2 = performance.now()
  console.log(`##### edgeViewBuilder took ${t2 - t1} milliseconds.`)
  return result
}

/**
 *
 * Compute visual value from attribute value
 * by applying the discrete mapping
 *
 */
export const applyDiscreteMapping = (
  dm: DiscreteMappingFunction,
  attributeValue: ValueType,
): VisualPropertyValueType => {
  const { vpValueMap, defaultValue } = dm
  return vpValueMap.get(attributeValue) ?? defaultValue
}

/**
 * Passthrough mapping is always an identity function
 */
export const applyPassthroughMapping = (
  attributeValue: ValueType,
): VisualPropertyValueType => attributeValue as VisualPropertyValueType

/**
 * TODO: implement this!!
 *
 * @param cm
 * @param attributeValue
 * @returns
 */
export const applyContinuousMapping = (
  cm: ContinuousMappingFunction,
  attributeValue: ValueType,
): VisualPropertyValueType => {
  return false
}

const getMappedValue = (
  mapping: VisualMappingFunction,
  attributeValue: ValueType,
): VisualPropertyValueType => {
  const mappingType: MappingFunctionType = mapping.type
  if (mappingType === MappingFunctionType.Passthrough) {
    return applyPassthroughMapping(attributeValue)
  } else if (mappingType === MappingFunctionType.Discrete) {
    return applyDiscreteMapping(
      mapping as DiscreteMappingFunction,
      attributeValue,
    )
  } else if (mappingType === MappingFunctionType.Continuous) {
    return applyContinuousMapping(
      mapping as ContinuousMappingFunction,
      attributeValue,
    )
  }

  throw new Error(`Mapping type not supported: ${mapping.type}`)
}

export const computeView = (
  id: IdType,
  visualProperties: Array<VisualProperty<VisualPropertyValueType>>,
  row: Record<AttributeName, ValueType>,
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
        const computedValue: VisualPropertyValueType = getMappedValue(
          mapping,
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
