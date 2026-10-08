/**
 * Builds the tiny graph a style thumbnail is rendered on.
 *
 * Pure model-layer code: no React, no Zustand, no cytoscape. The rendering
 * half lives in renderStylePreview.ts, which is where the DOM dependency is
 * confined so this file stays unit-testable under jsdom.
 *
 * Why a sample of the REAL network rather than a fixed Source -> Target pair
 * (what Cytoscape Desktop draws): a two-node graph has no attribute values, so
 * every mapping-driven style collapses to its defaults and styles that differ
 * only in their mappings render identically. Sampling the network the user is
 * looking at makes a continuous size or discrete color mapping actually visible.
 * The synthetic sample remains as the fallback for library templates, which
 * have no network to sample.
 */
import { IdType } from '../../../../models/IdType'
import NetworkFn, { Edge, Network, Node } from '../../../../models/NetworkModel'
import TableFn, {
  AttributeName,
  Table,
  ValueType,
  ValueTypeName,
} from '../../../../models/TableModel'
import { NetworkView } from '../../../../models/ViewModel'

/** Default number of nodes to put in a preview. */
export const DEFAULT_PREVIEW_NODE_LIMIT = 8

const SYNTHETIC_NETWORK_ID = 'style-preview-synthetic'
const NAME_COLUMN = 'name'

export interface PreviewPosition {
  x: number
  y: number
}

export interface PreviewSample {
  network: Network
  nodeTable: Table
  edgeTable: Table
  /**
   * Positions for the sampled nodes. Kept beside the network rather than in a
   * NetworkView because applyVisualStyle() builds the view itself; the caller
   * stamps these onto the resulting nodeViews.
   */
  positions: Record<IdType, PreviewPosition>
  /**
   * Identifies this sample for cache keys. Two samples with the same key are
   * interchangeable, so a thumbnail rendered against one is valid for the other.
   */
  key: string
}

/**
 * Select up to `limit` node ids, preferring nodes that participate in edges.
 *
 * Taking simply the first N nodes tends to produce an edgeless preview on
 * networks whose node list is not edge-ordered, which hides every edge visual
 * property. Walking the edge list first guarantees the sample has edges in it
 * whenever the network does.
 */
const pickNodeIds = (network: Network, limit: number): IdType[] => {
  const picked: IdType[] = []
  const seen = new Set<IdType>()

  const take = (id: IdType): void => {
    if (!seen.has(id) && picked.length < limit) {
      seen.add(id)
      picked.push(id)
    }
  }

  for (const edge of network.edges) {
    if (picked.length >= limit) {
      break
    }
    // Both endpoints together, so a partially-filled sample still yields a
    // connected pair rather than two orphan halves of different edges.
    take(edge.s)
    take(edge.t)
  }

  // Top up with isolated nodes so a network with few or no edges still shows
  // node styling.
  for (const node of network.nodes) {
    if (picked.length >= limit) {
      break
    }
    take(node.id)
  }

  return picked
}

/** Restrict a table to the given row ids, keeping every column. */
const subsetTable = (table: Table, ids: IdType[]): Table => {
  const rows = new Map<IdType, Record<AttributeName, ValueType>>()
  ids.forEach((id) => {
    const row = table.rows.get(id)
    if (row !== undefined) {
      rows.set(id, row)
    }
  })
  // Columns are kept whole: a mapping references a column by name and must
  // still resolve even when no sampled row happens to carry a value for it.
  return TableFn.createTable(table.id, [...table.columns], rows)
}

/**
 * Lay nodes out on a circle, in the order they were picked.
 *
 * Deterministic — no Math.random — so a preview is byte-identical across
 * renders and the cache never has to invalidate on layout alone.
 */
const circlePositions = (
  ids: IdType[],
  radius = 100,
): Record<IdType, PreviewPosition> => {
  const positions: Record<IdType, PreviewPosition> = {}
  if (ids.length === 1) {
    positions[ids[0]] = { x: 0, y: 0 }
    return positions
  }
  ids.forEach((id, index) => {
    const angle = (2 * Math.PI * index) / ids.length
    positions[id] = {
      x: Math.round(radius * Math.cos(angle)),
      y: Math.round(radius * Math.sin(angle)),
    }
  })
  return positions
}

/**
 * Sample an induced subgraph of a loaded network to preview styles on.
 *
 * Existing view positions are reused when available, so the preview echoes the
 * layout the user already sees and no layout algorithm has to run. Nodes
 * missing a view (added but not yet laid out) fall back to a circle.
 */
export const sampleFromNetwork = (
  network: Network,
  nodeTable: Table,
  edgeTable: Table,
  networkView?: NetworkView,
  limit: number = DEFAULT_PREVIEW_NODE_LIMIT,
): PreviewSample | undefined => {
  if (network.nodes.length === 0) {
    return undefined
  }

  const nodeIds = pickNodeIds(network, limit)
  const nodeIdSet = new Set(nodeIds)
  const nodes: Node[] = nodeIds.map((id) => ({ id }))
  // Induced: only edges with BOTH endpoints sampled, or cytoscape would be
  // handed an edge pointing at a node that is not in the graph.
  const edges: Edge[] = network.edges.filter(
    (edge) => nodeIdSet.has(edge.s) && nodeIdSet.has(edge.t),
  )
  const edgeIds = edges.map((edge) => edge.id)

  const viewPositions = networkView?.nodeViews
  const fallback = circlePositions(nodeIds)
  const positions: Record<IdType, PreviewPosition> = {}
  nodeIds.forEach((id) => {
    const nodeView = viewPositions?.[id]
    positions[id] =
      nodeView === undefined ? fallback[id] : { x: nodeView.x, y: nodeView.y }
  })

  return {
    network: NetworkFn.createNetworkFromLists(network.id, nodes, edges),
    nodeTable: subsetTable(nodeTable, nodeIds),
    edgeTable: subsetTable(edgeTable, edgeIds),
    positions,
    // Node ids pin the sample: a different selection is a different picture,
    // and the same selection always renders the same one.
    key: `${network.id}:${nodeIds.join(',')}`,
  }
}

/**
 * The Desktop-style fallback: two nodes and one edge, labelled Source and
 * Target. Used for library templates and for any state with no loaded network.
 *
 * Only a "name" column is provided. Styles mapping some other column fall back
 * to their defaults for that property, which is the same thing Desktop shows.
 */
export const syntheticSample = (): PreviewSample => {
  const nodes: Node[] = [{ id: 'n0' }, { id: 'n1' }]
  const edges: Edge[] = [{ id: 'e0', s: 'n0', t: 'n1' }]

  const nodeRows = new Map<IdType, Record<AttributeName, ValueType>>([
    ['n0', { [NAME_COLUMN]: 'Source' }],
    ['n1', { [NAME_COLUMN]: 'Target' }],
  ])
  const edgeRows = new Map<IdType, Record<AttributeName, ValueType>>([
    ['e0', { [NAME_COLUMN]: 'interacts with' }],
  ])
  const columns = [{ name: NAME_COLUMN, type: ValueTypeName.String }]

  return {
    network: NetworkFn.createNetworkFromLists(
      SYNTHETIC_NETWORK_ID,
      nodes,
      edges,
    ),
    nodeTable: TableFn.createTable(SYNTHETIC_NETWORK_ID, columns, nodeRows),
    edgeTable: TableFn.createTable(SYNTHETIC_NETWORK_ID, columns, edgeRows),
    positions: { n0: { x: -60, y: 0 }, n1: { x: 60, y: 0 } },
    key: SYNTHETIC_NETWORK_ID,
  }
}
