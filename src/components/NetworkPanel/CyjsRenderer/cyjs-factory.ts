import { Core } from 'cytoscape'
import { IdType } from '../../../models/IdType'
import { Edge } from '../../../models/NetworkModel'
import { ValueType } from '../../../models/TableModel'
import { EdgeView, NodeView } from '../../../models/ViewModel'
import {
  VisualPropertyName, NodeVisualPropertyName, EdgeVisualPropertyName,
  VisualPropertyValueType,
} from '../../../models/VisualStyleModel'
import { arrowColorMatchesEdgeType, nodeSizeLockedType, VisualEditorProperties } from '../../../models/VisualStyleModel/VisualStyleOptions'

function updateEdgeColors(newData: Record<string, ValueType>, colorProperty: EdgeVisualPropertyName) {
  const color = newData[colorProperty];
  newData[EdgeVisualPropertyName.EdgeSourceArrowColor] = color;
  newData[EdgeVisualPropertyName.EdgeTargetArrowColor] = color;
  newData[EdgeVisualPropertyName.EdgeLineColor] = color;
}

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

const createCyNodes = (nodeViews: NodeView[], nodeSizeLocked: nodeSizeLockedType): CyNode[] =>
  nodeViews.map((nv: NodeView) => {
    const data: Record<VisualPropertyName | IdType, ValueType> = {
      id: nv.id,
      ...Object.fromEntries(nv.values.entries()),
    }
    if (nodeSizeLocked === nodeSizeLockedType.WIDTHLOCKED) {
      data[NodeVisualPropertyName.NodeWidth] = data[NodeVisualPropertyName.NodeHeight]
    } else if (nodeSizeLocked === nodeSizeLockedType.HEIGHTLOCKED) {
      data[NodeVisualPropertyName.NodeHeight] = data[NodeVisualPropertyName.NodeWidth]
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
  arrowColorMatchesEdge: arrowColorMatchesEdgeType
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

    switch (arrowColorMatchesEdge) {
      case arrowColorMatchesEdgeType.SRCARRCOLOR:
        updateEdgeColors(newData, EdgeVisualPropertyName.EdgeSourceArrowColor);
        break;
      case arrowColorMatchesEdgeType.TGTARRCOLOR:
        updateEdgeColors(newData, EdgeVisualPropertyName.EdgeTargetArrowColor);
        break;
      case arrowColorMatchesEdgeType.LINECOLOR:
        updateEdgeColors(newData, EdgeVisualPropertyName.EdgeLineColor);
        break;
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
  cy.add(createCyNodes(nodeViews, visualEditorProperties?.nodeSizeLocked ?? nodeSizeLockedType.NONE))
  cy.add(createCyEdges(edges, edgeViews, visualEditorProperties?.arrowColorMatchesEdge ?? arrowColorMatchesEdgeType.NONE))
}
