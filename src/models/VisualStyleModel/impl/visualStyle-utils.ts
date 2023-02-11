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
import { nodeVisualProperties } from './VisualStyleImpl'

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
  edgeViews: edgeViewBuilder(network.edges),
  selectedNodes: [],
  selectedEdges: [],
})

const nodeViewBuilder = (
  nodes: Node[],
  visualProps: Array<VisualProperty<VisualPropertyValueType>>,
  nodeTable: Table,
): Record<IdType, NodeView> =>
  nodes
    .map((node: Node) => ({
      id: node.id,
      values: computeView(
        node.id,
        visualProps,
        nodeTable.rows.get(node.id) ?? {},
      ),
      x: 0,
      y: 0,
    }))
    .reduce(
      (acc, nv) => ({
        ...acc,
        [nv.id]: nv,
      }),
      {},
    )

const edgeViewBuilder = (edges: Edge[]): Record<IdType, EdgeView> =>
  edges
    .map((edge: Edge) => ({
      id: edge.id,
      values: new Map<VisualPropertyName, VisualPropertyValueType>(),
    }))
    .reduce(
      (acc, ev) => ({
        ...acc,
        [ev.id]: ev,
      }),
      {},
    )

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
