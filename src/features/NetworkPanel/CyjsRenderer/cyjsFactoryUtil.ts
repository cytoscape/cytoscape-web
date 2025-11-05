/**
 * cyjs-factory.ts
 *
 * This module provides utility functions and types for transforming
 * application-specific network data (nodes, edges, and their visual properties)
 * into Cytoscape.js-compatible objects. It handles mapping of node and edge
 * visual properties, including shape, color, and label rotation, and provides
 * a function to add these objects to a Cytoscape.js instance.
 */

import { Core } from 'cytoscape'

import { IdType } from '../../../models/IdType'
import { Edge } from '../../../models/NetworkModel'
import { ValueType } from '../../../models/TableModel'
import { EdgeView, NodeView } from '../../../models/ViewModel'
import {
  EdgeVisualPropertyName,
  NodeShapeType,
  NodeVisualPropertyName,
  VisualPropertyName,
  VisualPropertyValueType,
} from '../../../models/VisualStyleModel'
import { VisualEditorProperties } from '../../../models/VisualStyleModel/VisualStyleOptions'

/**
 * Maps application node shape types to Cytoscape.js node shape strings.
 */
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

/**
 * Cytoscape.js node object interface.
 */
export interface CyNode {
  group: 'nodes'
  data: Record<VisualPropertyName | IdType, ValueType>
  position: {
    x: number
    y: number
  }
}

/**
 * Cytoscape.js edge object interface.
 */
export interface CyEdge {
  group: 'edges'
  data: {
    [key: string]: ValueType
  }
}

/**
 * Transforms node visual property entries into Cytoscape.js-compatible properties.
 * Handles special cases such as shape mapping and label rotation.
 *
 * @param entries - Iterable of [propertyName, value] pairs for a node
 * @returns Record of transformed node properties
 */
const transformNodeProperties = (
  entries: Iterable<[string, any]>,
): Record<string, any> => {
  const result: Record<string, any> = {}
  for (const [key, value] of entries) {
    switch (key) {
      case NodeVisualPropertyName.NodeShape:
        result[key] = NodeShapeMapping[value as NodeShapeType]
        break
      case NodeVisualPropertyName.NodeLabelRotation:
        // Convert degrees to radians for Cytoscape.js
        result[key] = ((value as number) * Math.PI) / 180
        break
      default:
        result[key] = value
    }
  }
  return result
}

/**
 * Transforms edge visual property entries into Cytoscape.js-compatible properties.
 * Handles special cases such as label rotation.
 *
 * @param entries - Iterable of [propertyName, value] pairs for an edge
 * @returns Record of transformed edge properties
 */
const transformEdgeProperties = (
  entries: Iterable<[string, any]>,
): Record<string, any> => {
  const result: Record<string, any> = {}
  for (const [key, value] of entries) {
    switch (key) {
      case EdgeVisualPropertyName.EdgeLabelRotation:
        // Convert degrees to radians for Cytoscape.js
        result[key] = ((value as number) * Math.PI) / 180
        break
      default:
        result[key] = value
    }
  }
  return result
}

/**
 * Creates an array of Cytoscape.js node objects from NodeView data.
 *
 * @param nodeViews - Array of NodeView objects
 * @param nodeSizeLocked - If true, node width is locked to node height
 * @returns Array of CyNode objects
 */
const createCyNodes = (
  nodeViews: NodeView[],
  nodeSizeLocked: boolean,
): CyNode[] =>
  nodeViews.map((nv: NodeView) => {
    const data: Record<VisualPropertyName | IdType, ValueType> = {
      id: nv.id,
      ...transformNodeProperties(nv.values.entries()),
    }

    // If node size is locked, set width equal to height
    if (nodeSizeLocked) {
      data[NodeVisualPropertyName.NodeWidth] =
        data[NodeVisualPropertyName.NodeHeight]
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

/**
 * Creates an array of Cytoscape.js edge objects from Edge and EdgeView data.
 *
 * @param edges - Array of Edge objects
 * @param edgeViews - Mapping from edge ID to EdgeView
 * @param arrowColorMatchesEdge - If true, arrow colors are set to match edge line color
 * @returns Array of CyEdge objects
 */
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

    // If arrow color should match edge color, set arrow color properties accordingly
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

/**
 * Adds node and edge objects to a Cytoscape.js instance.
 *
 * @param cy - Cytoscape.js core instance
 * @param nodeViews - Array of NodeView objects
 * @param edges - Array of Edge objects
 * @param edgeViews - Mapping from edge ID to EdgeView
 * @param visualEditorProperties - Visual editor options (e.g., node size lock, arrow color match)
 */
export const addCyElements = (
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
