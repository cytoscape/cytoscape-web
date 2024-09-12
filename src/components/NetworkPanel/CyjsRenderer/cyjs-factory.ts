import { Core } from 'cytoscape'
import { IdType } from '../../../models/IdType'
import { Edge } from '../../../models/NetworkModel'
import { ValueType } from '../../../models/TableModel'
import { EdgeView, NodeView } from '../../../models/ViewModel'
import {
  VisualPropertyName,
  NodeVisualPropertyName,
  EdgeVisualPropertyName,
  VisualPropertyValueType,
  NodeShapeType,
} from '../../../models/VisualStyleModel'
import { VisualEditorProperties } from '../../../models/VisualStyleModel/VisualStyleOptions'

export const NodeShapeMapping: Record<NodeShapeType, string> = {
  [NodeShapeType.Parallelogram]: 'rhomboid',
  [NodeShapeType.RoundRectangle]: 'roundrectangle',
  [NodeShapeType.Triangle]: 'triangle',
  [NodeShapeType.Diamond]: 'diamond',
  [NodeShapeType.Octagon]: 'octagon',
  [NodeShapeType.Hexagon]: 'hexagon',
  [NodeShapeType.Ellipse]: 'ellipse',
  [NodeShapeType.Rectangle]: 'rectangle',
  [NodeShapeType.Vee]: 'vee',
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

const transformNodeProperties = (entries: Iterable<[string, any]>): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const [key, value] of entries) {
    switch (key) {
      case NodeVisualPropertyName.NodeShape:
        result[key] = NodeShapeMapping[value as NodeShapeType];
        break;
      case NodeVisualPropertyName.NodeLabelRotation:
        result[key] = (value as number * Math.PI) / 180;
        break;
      default:
        result[key] = value;
    }
  }
  return result;
};

const transformEdgeProperties = (entries: Iterable<[string, any]>): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const [key, value] of entries) {
    switch (key) {
      case EdgeVisualPropertyName.EdgeLabelRotation:
        result[key] = (value as number * Math.PI) / 180;
        break;
      default:
        result[key] = value;
    }
  }
  return result;
}

const createCyNodes = (
  nodeViews: NodeView[],
  nodeSizeLocked: boolean,
): CyNode[] =>
  nodeViews.map((nv: NodeView) => {
    const data: Record<VisualPropertyName | IdType, ValueType> = {
      id: nv.id,
      ...transformNodeProperties(nv.values.entries()),
    };

    if (nodeSizeLocked) {
      data[NodeVisualPropertyName.NodeWidth] = data[NodeVisualPropertyName.NodeHeight];
    }

    return {
      group: 'nodes',
      data,
      position: {
        x: nv.x,
        y: nv.y,
      },
    };
  });

const createCyEdges = (
  edges: Edge[],
  edgeViews: Record<IdType, EdgeView>,
  arrowColorMatchesEdge: boolean,
): CyEdge[] =>
  edges.map((edge: Edge): CyEdge => {
    const edgeView: EdgeView = edgeViews[edge.id]
    const newData: Record<string, ValueType> = {
      id: edge.id,
      source: edge.s,
      target: edge.t,
      ...transformEdgeProperties(edgeView.values.entries()),
    }

    if (arrowColorMatchesEdge) {
      const color = newData[EdgeVisualPropertyName.EdgeLineColor]
      newData[EdgeVisualPropertyName.EdgeSourceArrowColor] = color
      newData[EdgeVisualPropertyName.EdgeTargetArrowColor] = color
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
  visualEditorProperties: VisualEditorProperties,
): void => {
  cy.add(
    createCyNodes(nodeViews, visualEditorProperties?.nodeSizeLocked ?? false),
  )
  cy.add(
    createCyEdges(
      edges,
      edgeViews,
      visualEditorProperties?.arrowColorMatchesEdge ?? false,
    ),
  )
}
