import { Core } from 'cytoscape'
import { IdType } from '../../../models/IdType'
import { Edge } from '../../../models/NetworkModel'
import { ValueType } from '../../../models/TableModel'
import { EdgeView, NodeView } from '../../../models/ViewModel'
import {
  VisualPropertyName, NodeVisualPropertyName, EdgeVisualPropertyName,
  VisualPropertyValueType,
} from '../../../models/VisualStyleModel'
import { VisualEditorProperties } from '../../../models/VisualStyleModel/VisualStyleOptions'

export interface CyNode {
  group: 'nodes'
  data: Record<VisualPropertyName | IdType, ValueType>
  position: {
    x: number
    y: number
  }
}

export interface CyEdge {
  group: 'edges'
  data: {
    [key: string]: ValueType
  }
}

const createCyNodes = (nodeViews: NodeView[], nodeSizeLocked: boolean): CyNode[] =>
  nodeViews.map((nv: NodeView) => {
    const data: Record<VisualPropertyName | IdType, ValueType> = {
      id: nv.id,
      ...Object.fromEntries(nv.values.entries()),
    }
    if (nodeSizeLocked) {// Use height to override width
      data[NodeVisualPropertyName.NodeWidth] = data[NodeVisualPropertyName.NodeHeight]
    }
    return {
      group: 'nodes',
      data,
      position: {
        x: nv.x,
        y: nv.y,
      },
    }
  })

const createCyEdges = (
  edges: Edge[],
  edgeViews: Record<IdType, EdgeView>,
  arrowColorMatchesEdge: boolean
): CyEdge[] =>
  edges.map((edge: Edge): CyEdge => {
    const edgeView: EdgeView = edgeViews[edge.id]
    const { values } = edgeView
    const newData: Record<string, ValueType> = {
      id: edge.id,
      source: edge.s,
      target: edge.t,
    }
    values.forEach(
      (value: VisualPropertyValueType, key: VisualPropertyName) => {
        newData[key] = value as ValueType
      },
    )

    if (arrowColorMatchesEdge) {
      const color = newData[EdgeVisualPropertyName.EdgeLineColor];
      newData[EdgeVisualPropertyName.EdgeSourceArrowColor] = color;
      newData[EdgeVisualPropertyName.EdgeTargetArrowColor] = color;
    }

    return {
      group: 'edges',
      data: newData,
    }
  })

export const addObjects = (
  cy: Core,
  nodeViews: NodeView[],
  edges: Edge[],
  edgeViews: Record<IdType, EdgeView>,
  visualEditorProperties: VisualEditorProperties
): void => {
  cy.add(createCyNodes(nodeViews, visualEditorProperties?.nodeSizeLocked ?? false))
  cy.add(createCyEdges(edges, edgeViews, visualEditorProperties?.arrowColorMatchesEdge ?? false))
}
