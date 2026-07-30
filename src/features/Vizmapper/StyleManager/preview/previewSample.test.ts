import { describe, expect, it } from 'vitest'

import { IdType } from '../../../../models/IdType'
import NetworkFn, { Edge, Node } from '../../../../models/NetworkModel'
import TableFn, {
  AttributeName,
  ValueType,
  ValueTypeName,
} from '../../../../models/TableModel'
import { NetworkView, NodeView } from '../../../../models/ViewModel'
import { VisualPropertyName } from '../../../../models/VisualStyleModel'
import {
  DEFAULT_PREVIEW_NODE_LIMIT,
  sampleFromNetwork,
  syntheticSample,
} from './previewSample'

const NETWORK_ID = 'preview-network'

const buildNetwork = (nodeIds: IdType[], edges: Edge[]) =>
  NetworkFn.createNetworkFromLists(
    NETWORK_ID,
    nodeIds.map((id): Node => ({ id })),
    edges,
  )

const buildTable = (
  ids: IdType[],
  columnName: AttributeName = 'name',
  value: (id: IdType) => ValueType = (id) => `row-${id}`,
) =>
  TableFn.createTable(
    NETWORK_ID,
    [{ name: columnName, type: ValueTypeName.String }],
    new Map(ids.map((id) => [id, { [columnName]: value(id) }])),
  )

const nodeView = (id: IdType, x: number, y: number): NodeView => ({
  id,
  x,
  y,
  values: new Map<VisualPropertyName, any>(),
})

const viewOf = (nodeViews: NodeView[]): NetworkView => ({
  id: NETWORK_ID,
  values: new Map(),
  nodeViews: Object.fromEntries(nodeViews.map((nv) => [nv.id, nv])),
  edgeViews: {},
  selectedNodes: [],
  selectedEdges: [],
})

describe('sampleFromNetwork', () => {
  it('returns undefined for a network with no nodes', () => {
    const sample = sampleFromNetwork(
      buildNetwork([], []),
      buildTable([]),
      buildTable([]),
    )

    expect(sample).toBeUndefined()
  })

  it('caps the sample at the requested node limit', () => {
    const nodeIds = Array.from({ length: 30 }, (_, i) => `n${i}`)
    const sample = sampleFromNetwork(
      buildNetwork(nodeIds, []),
      buildTable(nodeIds),
      buildTable([]),
      undefined,
      5,
    )

    expect(sample?.network.nodes).toHaveLength(5)
  })

  it('defaults to DEFAULT_PREVIEW_NODE_LIMIT nodes', () => {
    const nodeIds = Array.from({ length: 30 }, (_, i) => `n${i}`)
    const sample = sampleFromNetwork(
      buildNetwork(nodeIds, []),
      buildTable(nodeIds),
      buildTable([]),
    )

    expect(sample?.network.nodes).toHaveLength(DEFAULT_PREVIEW_NODE_LIMIT)
  })

  it('prefers connected nodes so the preview actually contains edges', () => {
    // The regression this guards: taking the first N nodes off the node list
    // yields an edgeless preview here, hiding every edge visual property.
    const nodeIds = ['a', 'b', 'c', 'd', 'e', 'f']
    const edges: Edge[] = [{ id: 'e1', s: 'e', t: 'f' }]
    const sample = sampleFromNetwork(
      buildNetwork(nodeIds, edges),
      buildTable(nodeIds),
      buildTable(['e1']),
      undefined,
      2,
    )

    expect(sample?.network.nodes.map((n) => n.id).sort()).toEqual(['e', 'f'])
    expect(sample?.network.edges).toHaveLength(1)
  })

  it('keeps only edges with both endpoints sampled', () => {
    // A dangling edge would make cytoscape reference a node that is not in the
    // graph.
    const nodeIds = ['a', 'b', 'c', 'd']
    const edges: Edge[] = [
      { id: 'e1', s: 'a', t: 'b' },
      { id: 'e2', s: 'c', t: 'd' },
    ]
    const sample = sampleFromNetwork(
      buildNetwork(nodeIds, edges),
      buildTable(nodeIds),
      buildTable(['e1', 'e2']),
      undefined,
      2,
    )

    const sampledNodes = new Set(sample?.network.nodes.map((n) => n.id))
    sample?.network.edges.forEach((edge) => {
      expect(sampledNodes.has(edge.s)).toBe(true)
      expect(sampledNodes.has(edge.t)).toBe(true)
    })
  })

  it('reuses existing view positions so no layout has to run', () => {
    const edges: Edge[] = [{ id: 'e1', s: 'a', t: 'b' }]
    const sample = sampleFromNetwork(
      buildNetwork(['a', 'b'], edges),
      buildTable(['a', 'b']),
      buildTable(['e1']),
      viewOf([nodeView('a', 11, 22), nodeView('b', 33, 44)]),
    )

    expect(sample?.positions.a).toEqual({ x: 11, y: 22 })
    expect(sample?.positions.b).toEqual({ x: 33, y: 44 })
  })

  it('falls back to a deterministic layout for nodes with no view', () => {
    const edges: Edge[] = [{ id: 'e1', s: 'a', t: 'b' }]
    const args = [
      buildNetwork(['a', 'b'], edges),
      buildTable(['a', 'b']),
      buildTable(['e1']),
      // 'b' has no view entry
      viewOf([nodeView('a', 11, 22)]),
    ] as const

    const first = sampleFromNetwork(...args)
    const second = sampleFromNetwork(...args)

    expect(first?.positions.b).toBeDefined()
    // Deterministic, so a thumbnail is byte-identical between renders and the
    // cache never invalidates on layout alone.
    expect(first?.positions.b).toEqual(second?.positions.b)
  })

  it('subsets table rows but keeps every column', () => {
    const nodeIds = ['a', 'b', 'c']
    const nodeTable = TableFn.createTable(
      NETWORK_ID,
      [
        { name: 'name', type: ValueTypeName.String },
        { name: 'degree', type: ValueTypeName.Integer },
      ],
      new Map(nodeIds.map((id) => [id, { name: id, degree: 1 }])),
    )

    const sample = sampleFromNetwork(
      buildNetwork(nodeIds, []),
      nodeTable,
      buildTable([]),
      undefined,
      2,
    )

    expect(sample?.nodeTable.rows.size).toBe(2)
    // A mapping references a column by name and must still resolve even when
    // no sampled row carries a value for it.
    expect(sample?.nodeTable.columns.map((c) => c.name)).toEqual([
      'name',
      'degree',
    ])
  })

  it('keys the sample by the node ids it selected', () => {
    const sample = sampleFromNetwork(
      buildNetwork(['a', 'b'], []),
      buildTable(['a', 'b']),
      buildTable([]),
    )

    expect(sample?.key).toBe(`${NETWORK_ID}:a,b`)
  })
})

describe('syntheticSample', () => {
  it('builds the Desktop-style two-node fallback', () => {
    const sample = syntheticSample()

    expect(sample.network.nodes).toHaveLength(2)
    expect(sample.network.edges).toHaveLength(1)
    expect(sample.nodeTable.rows.get('n0')?.name).toBe('Source')
    expect(sample.nodeTable.rows.get('n1')?.name).toBe('Target')
  })

  it('positions both nodes and keys itself distinctly from any network', () => {
    const sample = syntheticSample()

    expect(Object.keys(sample.positions).sort()).toEqual(['n0', 'n1'])
    expect(sample.key).not.toContain(':')
  })
})
