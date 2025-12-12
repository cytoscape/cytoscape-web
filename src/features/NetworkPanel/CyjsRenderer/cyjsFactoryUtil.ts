/**
 * cyjs-factory.ts
 *
 * This module provides utility functions and types for creating Cytoscape.js
 * element objects (nodes and edges) from application-specific network data.
 * Note: Visual property transformations (shape mapping, rotation conversion)
 * are handled by applyViewModel() in cyjsRenderUtil.ts, not in this module.
 */

import { Core } from 'cytoscape'

import { IdType } from '../../../models/IdType'
import { Edge } from '../../../models/NetworkModel'
import { ValueType } from '../../../models/TableModel'
import { EdgeView, NodeView } from '../../../models/ViewModel'
import { VisualPropertyName } from '../../../models/VisualStyleModel'

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
 * Creates an array of Cytoscape.js node objects from NodeView data.
 * Note: Visual property transformations (shape mapping, rotation conversion) are handled
 * by applyViewModel() in cyjsRenderUtil.ts, not during element creation.
 *
 * @param nodeViews - Array of NodeView objects
 * @returns Array of CyNode objects
 */
const createCyNodes = (nodeViews: NodeView[]): CyNode[] =>
  nodeViews.map((nv: NodeView) => {
    // Create elements with raw data - transformations will be applied via applyViewModel()
    const data: Record<VisualPropertyName | IdType, ValueType> = {
      id: nv.id,
      ...Object.fromEntries(nv.values.entries()),
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
 * Note: Visual property transformations (rotation conversion) and visual editor property
 * overrides (arrow color matching) are handled by applyViewModel() in cyjsRenderUtil.ts,
 * not during element creation.
 *
 * @param edges - Array of Edge objects
 * @param edgeViews - Mapping from edge ID to EdgeView
 * @returns Array of CyEdge objects
 */
const createCyEdges = (
  edges: Edge[],
  edgeViews: Record<IdType, EdgeView>,
): CyEdge[] =>
  edges.map((edge: Edge): CyEdge => {
    const edgeView: EdgeView = edgeViews[edge.id]
    // Create elements with raw data - transformations will be applied via applyViewModel()
    const newData: Record<string, ValueType> = {
      id: edge.id,
      source: edge.s,
      target: edge.t,
      ...Object.fromEntries(edgeView.values.entries()),
    }

    return {
      group: 'edges',
      data: newData,
    }
  })

/**
 * Adds node and edge objects to a Cytoscape.js instance.
 * Note: This creates elements with raw data. Visual property transformations
 * (shape mapping, rotation conversion) and visual editor property overrides
 * (node size lock, arrow color matching) should be applied via applyViewModel()
 * from cyjsRenderUtil.ts after calling this function.
 *
 * @param cy - Cytoscape.js core instance
 * @param nodeViews - Array of NodeView objects
 * @param edges - Array of Edge objects
 * @param edgeViews - Mapping from edge ID to EdgeView
 */
export const addCyElements = (
  cy: Core,
  nodeViews: NodeView[],
  edges: Edge[],
  edgeViews: Record<IdType, EdgeView>,
): void => {
  cy.add(createCyNodes(nodeViews))
  cy.add(createCyEdges(edges, edgeViews))
}
