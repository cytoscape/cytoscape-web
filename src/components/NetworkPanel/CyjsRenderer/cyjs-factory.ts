import { Core } from 'cytoscape'
import { IdType } from '../../../models/IdType'
import { Edge } from '../../../models/NetworkModel'
import { ValueType } from '../../../models/TableModel'
import { EdgeView, NodeView } from '../../../models/ViewModel'
import {
  VisualPropertyName, NodeVisualPropertyNames, EdgeVisualPropertyNames, EdgeVisualPropertyName,
  VisualPropertyValueType,
} from '../../../models/VisualStyleModel'
import { arrowColorMatchesEdgeType, nodeSizeLockedType, VisualEditorProperties } from '../../../models/VisualStyleModel/VisualStyleOptions'

function updateEdgeColors(newData: Record<string, ValueType>, colorProperty: EdgeVisualPropertyName) {
  const color = newData[colorProperty];
  newData[EdgeVisualPropertyNames.edgeSourceArrowColor] = color;
  newData[EdgeVisualPropertyNames.edgeTargetArrowColor] = color;
  newData[EdgeVisualPropertyNames.edgeLineColor] = color;
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
      data[NodeVisualPropertyNames.nodeWidth] = data[NodeVisualPropertyNames.nodeHeight]
    } else if (nodeSizeLocked === nodeSizeLockedType.HEIGHTLOCKED) {
      data[NodeVisualPropertyNames.nodeHeight] = data[NodeVisualPropertyNames.nodeWidth]
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
        updateEdgeColors(newData, EdgeVisualPropertyNames.edgeSourceArrowColor);
        break;
      case arrowColorMatchesEdgeType.TGTARRCOLOR:
        updateEdgeColors(newData, EdgeVisualPropertyNames.edgeTargetArrowColor);
        break;
      case arrowColorMatchesEdgeType.LINECOLOR:
        updateEdgeColors(newData, EdgeVisualPropertyNames.edgeLineColor);
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
