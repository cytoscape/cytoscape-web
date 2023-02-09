import { Table } from 'dexie'
import { IdType } from '../../IdType'
import { Network } from '../../NetworkModel'
import { ValueType } from '../../TableModel'
import { EdgeView, NetworkView, NodeView } from '../../ViewModel'
import { DiscreteMappingFunction } from '../VisualMappingFunction'
import { VisualPropertyValueType } from '../VisualPropertyValue'
import { VisualStyle } from '../VisualStyle'

export const applyVisualStyle = (
  network: Network,
  nodeTable: Table,
  edgeTable: Table,
  visualStyle: VisualStyle,
): NetworkView => {
  const { nodes, edges } = network

  const nodeViews: Record<IdType, NodeView> = {}
  const edgeViews: Record<IdType, EdgeView> = {}

  nodes.forEach((node) => {
    const { id } = node
    const nodeView = {
      id,
      values: new Map(),
      x: 0,
      y: 0,
    }
    nodeViews[id] = nodeView
  })

  edges.forEach((edge) => {
    const { id } = edge
    const edgeView = {
      id,
      values: new Map(),
    }
    edgeViews[id] = edgeView
  })

  return {
    id: network.id,
    values: new Map(),
    nodeViews,
    edgeViews,
    selectedNodes: [],
    selectedEdges: [],
  }
}

export const applyDiscrete = (
  discreteMapper: DiscreteMappingFunction,
  attributeValue: ValueType,
): VisualPropertyValueType => {
  const vpValue = discreteMapper.vpValueMap.get(attributeValue)
  return vpValue !== undefined ? vpValue : discreteMapper.defaultValue
}

// Passthrough is an identity function.
export const applyPassthrough = (
  attributeValue: ValueType,
): VisualPropertyValueType => attributeValue as VisualPropertyValueType

// export const apply = (fn: VisualMappingFunction): VisualPropertyValueType => {
//   if(fn.type === 'discrete') {
//     return applyDiscrete(fn, fn.attributeValue)
//   }
// }
