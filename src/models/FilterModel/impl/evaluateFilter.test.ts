// @vitest-environment node
import { describe, expect, it } from 'vitest'

import type { IdType } from '../../IdType'
import type { Network } from '../../NetworkModel/Network'
import type { Table } from '../../TableModel/Table'
import type { ValueType } from '../../TableModel/ValueType'
import type { ValueTypeName } from '../../TableModel/ValueTypeName'
import { DisplayMode } from '../DisplayMode'
import {
  ColumnFilterCriterion,
  ColumnFilterNode,
  ColumnFilterTarget,
  DegreeEdgeType,
  FilterElementKind,
  FilterNode,
  FilterPredicate,
  MatchType,
  TopologyFilterNode,
} from '../FilterTree'
import {
  accepts,
  appliesTo,
  createFilterContext,
  evaluateFilter,
  FilterContext,
  isAlwaysFalse,
} from './evaluateFilter'
import {
  createColumnFilter,
  createCompositeFilter,
  createDegreeFilter,
  createTopologyFilter,
} from './filterTreeImpl'

const P = FilterPredicate
const NODE = FilterElementKind.NODE
const EDGE = FilterElementKind.EDGE

const network = (
  nodeIds: IdType[],
  edges: [IdType, IdType, IdType][] = [],
): Network => ({
  id: 'net',
  nodes: nodeIds.map((id) => ({ id })),
  edges: edges.map(([id, s, t]) => ({ id, s, t })),
})

const table = (
  columns: Record<string, ValueTypeName>,
  rows: Record<IdType, Record<string, ValueType>> = {},
): Table => ({
  id: 'table',
  columns: Object.entries(columns).map(([name, type]) => ({ name, type })),
  rows: new Map(Object.entries(rows)),
})

const EMPTY = table({})

const column = (
  columnName: string,
  predicate: FilterPredicate,
  criterion: ColumnFilterCriterion,
  overrides: Partial<ColumnFilterNode> = {},
): ColumnFilterNode => ({
  ...createColumnFilter(),
  columnName,
  predicate,
  criterion,
  ...overrides,
})

// Ids of the nodes of `ctx` that pass `node`
const acceptedNodes = (ctx: FilterContext, node: FilterNode): IdType[] =>
  ctx.network.nodes
    .filter(({ id }) => accepts(ctx, node, id, NODE))
    .map(({ id }) => id)

describe('column condition', () => {
  // Ported from Cytoscape Desktop's ColumnFilterTest
  it('compares text', () => {
    const ctx = createFilterContext(
      network(['n1', 'n2', 'n3', 'n4']),
      table(
        { s: 'string' },
        { n1: { s: 'aaa' }, n2: { s: 'bbb' }, n3: { s: 'ccc' } },
      ),
      EMPTY,
    )
    expect(acceptedNodes(ctx, column('s', P.CONTAINS, 'a'))).toEqual(['n1'])
    expect(acceptedNodes(ctx, column('s', P.DOES_NOT_CONTAIN, 'a'))).toEqual([
      'n2',
      'n3',
      'n4',
    ])
    expect(acceptedNodes(ctx, column('s', P.IS, 'a'))).toEqual([])
    expect(acceptedNodes(ctx, column('s', P.IS, 'aaa'))).toEqual(['n1'])
    expect(acceptedNodes(ctx, column('s', P.IS_NOT, 'aaa'))).toEqual([
      'n2',
      'n3',
      'n4',
    ])
    expect(acceptedNodes(ctx, column('s', P.REGEX, '.a.'))).toEqual(['n1'])
  })

  it('compares integers', () => {
    const ctx = createFilterContext(
      network(['n1', 'n2', 'n3', 'n4']),
      table(
        { i: 'integer' },
        { n1: { i: 111 }, n2: { i: 222 }, n3: { i: 333 } },
      ),
      EMPTY,
    )
    expect(acceptedNodes(ctx, column('i', P.BETWEEN, [200, 300]))).toEqual([
      'n2',
    ])
    expect(
      acceptedNodes(ctx, column('i', P.IS_NOT_BETWEEN, [200, 300])),
    ).toEqual(['n1', 'n3', 'n4'])
    // A single number is the range [n, n]
    expect(acceptedNodes(ctx, column('i', P.BETWEEN, 222))).toEqual(['n2'])
  })

  it('compares booleans and ignores the predicate', () => {
    const ctx = createFilterContext(
      network(['n1', 'n2', 'n3']),
      table({ b: 'boolean' }, { n1: { b: true }, n2: { b: false } }),
      EMPTY,
    )
    expect(acceptedNodes(ctx, column('b', P.IS, true))).toEqual(['n1'])
    expect(acceptedNodes(ctx, column('b', P.IS, false))).toEqual(['n2'])
    expect(acceptedNodes(ctx, column('b', P.IS_NOT, false))).toEqual(['n2'])
  })

  it('matches any or every element of a list', () => {
    const ctx = createFilterContext(
      network(['n1', 'n2', 'n3', 'n4', 'n5']),
      table(
        { l: 'list_of_string' },
        {
          n1: { l: ['a', 'b', 'c'] },
          n2: { l: ['c', 'd'] },
          n3: { l: ['a', 'a'] },
          n4: { l: [] },
        },
      ),
      EMPTY,
    )
    expect(acceptedNodes(ctx, column('l', P.IS, 'a'))).toEqual(['n1', 'n3'])
    // An empty list passes "every element", a missing list never does
    expect(
      acceptedNodes(ctx, column('l', P.IS, 'a', { anyMatch: false })),
    ).toEqual(['n3', 'n4'])
  })

  it('compares the elements of a numeric list', () => {
    const ctx = createFilterContext(
      network(['n1', 'n2']),
      table(
        { l: 'list_of_double' },
        { n1: { l: [1.5, 3] }, n2: { l: [3, 4] } },
      ),
      EMPTY,
    )
    expect(acceptedNodes(ctx, column('l', P.BETWEEN, [2, 5]))).toEqual([
      'n1',
      'n2',
    ])
    expect(
      acceptedNodes(ctx, column('l', P.BETWEEN, [2, 5], { anyMatch: false })),
    ).toEqual(['n2'])
  })

  it('passes a boolean list when any element equals the criterion', () => {
    const ctx = createFilterContext(
      network(['n1', 'n2']),
      table(
        { l: 'list_of_boolean' },
        { n1: { l: [false, true] }, n2: { l: [false] } },
      ),
      EMPTY,
    )
    expect(
      acceptedNodes(ctx, column('l', P.IS, true, { anyMatch: false })),
    ).toEqual(['n1'])
  })

  it('rejects every element when the column is missing', () => {
    const ctx = createFilterContext(network(['n1']), table({}), EMPTY)
    expect(acceptedNodes(ctx, column('s', P.IS_NOT, 'a'))).toEqual([])
  })

  it('rejects a criterion of the wrong kind for the column', () => {
    const ctx = createFilterContext(
      network(['n1']),
      table({ i: 'integer', s: 'string' }, { n1: { i: 1, s: '1' } }),
      EMPTY,
    )
    expect(acceptedNodes(ctx, column('i', P.IS_NOT_BETWEEN, 'x'))).toEqual([])
    expect(acceptedNodes(ctx, column('s', P.IS_NOT, 5))).toEqual([])
  })

  it('reads no inherited member for a column named like one', () => {
    const ctx = createFilterContext(
      network(['n1']),
      {
        id: 'table',
        columns: [
          { name: 'constructor', type: 'string' },
          { name: '__proto__', type: 'string' },
        ],
        rows: new Map([['n1', {}]]),
      },
      EMPTY,
    )
    ;['constructor', '__proto__'].forEach((name) => {
      // The row holds no value: a missing value passes DOES_NOT_CONTAIN only
      expect(acceptedNodes(ctx, column(name, P.DOES_NOT_CONTAIN, 'x'))).toEqual(
        ['n1'],
      )
      expect(acceptedNodes(ctx, column(name, P.CONTAINS, ''))).toEqual([])
    })
  })

  it('rejects every element for an invalid regex', () => {
    const ctx = createFilterContext(
      network(['n1']),
      table({ s: 'string' }, { n1: { s: 'a' } }),
      EMPTY,
    )
    expect(acceptedNodes(ctx, column('s', P.REGEX, '('))).toEqual([])
  })

  it('reads the table of its target only', () => {
    const ctx = createFilterContext(
      network(['n1'], [['e1', 'n1', 'n1']]),
      table({ w: 'double' }, { n1: { w: 1 } }),
      table({ w: 'double' }, { e1: { w: 1 } }),
    )
    const nodes = column('w', P.IS, 1)
    expect(accepts(ctx, nodes, 'n1', NODE)).toBe(true)
    expect(accepts(ctx, nodes, 'e1', EDGE)).toBe(false)
    const edges = column('w', P.IS, 1, { target: ColumnFilterTarget.EDGES })
    expect(accepts(ctx, edges, 'n1', NODE)).toBe(false)
    expect(accepts(ctx, edges, 'e1', EDGE)).toBe(true)
    const both = column('w', P.IS, 1, {
      target: ColumnFilterTarget.NODES_AND_EDGES,
    })
    expect(accepts(ctx, both, 'n1', NODE)).toBe(true)
    expect(accepts(ctx, both, 'e1', EDGE)).toBe(true)
  })
})

describe('group', () => {
  // Ported from Cytoscape Desktop's CompositeFilterTest
  it('combines its conditions with ANY or ALL', () => {
    const ctx = createFilterContext(
      network(['n1', 'n2', 'n3', 'n4']),
      table(
        { s: 'string' },
        { n1: { s: 'abc' }, n2: { s: 'def' }, n3: { s: 'aa' } },
      ),
      EMPTY,
    )
    const children = ['a', 'b', 'c'].map((letter) =>
      column('s', P.CONTAINS, letter),
    )
    expect(
      acceptedNodes(ctx, createCompositeFilter(MatchType.ANY, children)),
    ).toEqual(['n1', 'n3'])
    expect(
      acceptedNodes(ctx, createCompositeFilter(MatchType.ALL, children)),
    ).toEqual(['n1'])
  })

  it('accepts everything when empty', () => {
    const ctx = createFilterContext(network(['n1']), EMPTY, EMPTY)
    expect(acceptedNodes(ctx, createCompositeFilter(MatchType.ANY))).toEqual([
      'n1',
    ])
    expect(acceptedNodes(ctx, createCompositeFilter(MatchType.ALL))).toEqual([
      'n1',
    ])
  })
})

describe('isAlwaysFalse', () => {
  // Ported from Cytoscape Desktop's ColumnFilterTest and CompositeFilterTest
  it('is true for a column condition until it is complete', () => {
    expect(isAlwaysFalse(createColumnFilter())).toBe(true)
    const withCriterion: ColumnFilterNode = {
      ...createColumnFilter(),
      predicate: P.IS,
      criterion: 'a',
    }
    expect(isAlwaysFalse(withCriterion)).toBe(true)
    expect(isAlwaysFalse({ ...withCriterion, columnName: 'c' })).toBe(false)
  })

  it('follows the match type of a group', () => {
    const incomplete = createColumnFilter()
    const complete = column('s', P.CONTAINS, 'a')
    const group = (matchType: MatchType, children: FilterNode[]) =>
      createCompositeFilter(matchType, children)

    expect(isAlwaysFalse(group(MatchType.ALL, [incomplete, incomplete]))).toBe(
      true,
    )
    expect(isAlwaysFalse(group(MatchType.ANY, [incomplete, incomplete]))).toBe(
      true,
    )
    expect(isAlwaysFalse(group(MatchType.ALL, [complete, incomplete]))).toBe(
      true,
    )
    expect(isAlwaysFalse(group(MatchType.ANY, [complete, incomplete]))).toBe(
      false,
    )
    expect(isAlwaysFalse(group(MatchType.ALL, [complete, complete]))).toBe(
      false,
    )
    expect(isAlwaysFalse(createCompositeFilter())).toBe(false)
  })

  it('is false for degree and topology conditions', () => {
    expect(isAlwaysFalse(createDegreeFilter())).toBe(false)
    expect(isAlwaysFalse(createTopologyFilter())).toBe(false)
  })
})

describe('degree condition', () => {
  // n1 -> n2, n1 -> n3, n3 -> n1, n2 -> n2 (self-loop)
  const ctx = (): FilterContext =>
    createFilterContext(
      network(
        ['n1', 'n2', 'n3', 'n4'],
        [
          ['e1', 'n1', 'n2'],
          ['e2', 'n1', 'n3'],
          ['e3', 'n3', 'n1'],
          ['e4', 'n2', 'n2'],
        ],
      ),
      EMPTY,
      EMPTY,
    )
  const degree = (
    edgeType: DegreeEdgeType,
    criterion: [number, number] | null,
    predicate: FilterPredicate = P.BETWEEN,
  ): FilterNode => ({ ...createDegreeFilter(), edgeType, criterion, predicate })

  it('counts every edge at a node, a self-loop once', () => {
    // Degrees: n1 3, n2 2, n3 2, n4 0
    expect(acceptedNodes(ctx(), degree(DegreeEdgeType.ANY, [2, 2]))).toEqual([
      'n2',
      'n3',
    ])
    expect(acceptedNodes(ctx(), degree(DegreeEdgeType.ANY, [3, 9]))).toEqual([
      'n1',
    ])
  })

  it('counts incoming and outgoing edges', () => {
    // In: n1 1, n2 2, n3 1, n4 0. Out: n1 2, n2 1, n3 1, n4 0
    expect(
      acceptedNodes(ctx(), degree(DegreeEdgeType.INCOMING, [2, 2])),
    ).toEqual(['n2'])
    expect(
      acceptedNodes(ctx(), degree(DegreeEdgeType.OUTGOING, [2, 2])),
    ).toEqual(['n1'])
    expect(
      acceptedNodes(
        ctx(),
        degree(DegreeEdgeType.OUTGOING, [1, 2], P.IS_NOT_BETWEEN),
      ),
    ).toEqual(['n4'])
  })

  it('accepts every node without a range, and no edge', () => {
    const node = degree(DegreeEdgeType.ANY, null)
    expect(acceptedNodes(ctx(), node)).toEqual(['n1', 'n2', 'n3', 'n4'])
    expect(accepts(ctx(), node, 'e1', EDGE)).toBe(false)
  })
})

describe('topology condition', () => {
  const topology = (
    overrides: Partial<TopologyFilterNode>,
  ): TopologyFilterNode => ({
    ...createTopologyFilter(),
    ...overrides,
  })

  // Ported from Cytoscape Desktop's TopologyFilterTest
  it('counts the neighbours within a distance', () => {
    const net = network(
      ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8'],
      [
        ['e1', 'n1', 'n2'],
        ['e2', 'n1', 'n3'],
        ['e3', 'n1', 'n4'],
        ['e4', 'n2', 'n5'],
        ['e5', 'n3', 'n6'],
        ['e6', 'n4', 'n7'],
        ['e7', 'n7', 'n8'],
      ],
    )
    const nodeTable = table({ s: 'string' }, { n2: { s: 'a' }, n6: { s: 'a' } })
    const ctx = () => createFilterContext(net, nodeTable, EMPTY)

    expect(
      accepts(ctx(), topology({ threshold: 6, distance: 2 }), 'n1', NODE),
    ).toBe(true)
    expect(
      accepts(ctx(), topology({ threshold: 6, distance: 1 }), 'n1', NODE),
    ).toBe(false)

    const children = [column('s', P.IS, 'a')]
    expect(
      accepts(
        ctx(),
        topology({ threshold: 2, distance: 2, children }),
        'n1',
        NODE,
      ),
    ).toBe(true)
    expect(
      accepts(
        ctx(),
        topology({ threshold: 2, distance: 1, children }),
        'n1',
        NODE,
      ),
    ).toBe(false)
  })

  it('does not get caught in a cycle', () => {
    const net = network(
      ['n1', 'n2', 'n3', 'n4'],
      [
        ['e1', 'n1', 'n2'],
        ['e2', 'n2', 'n3'],
        ['e3', 'n3', 'n1'],
        ['e4', 'n3', 'n1'],
        ['e5', 'n3', 'n4'],
      ],
    )
    const nodeTable = table({ s: 'string' }, { n4: { s: 'a' } })
    const children = [column('s', P.IS, 'a')]
    const ctx = () => createFilterContext(net, nodeTable, EMPTY)
    expect(
      accepts(
        ctx(),
        topology({ threshold: 1, distance: 100, children }),
        'n1',
        NODE,
      ),
    ).toBe(true)
    expect(
      accepts(
        ctx(),
        topology({ threshold: 10, distance: 1000, children }),
        'n1',
        NODE,
      ),
    ).toBe(false)
  })

  it('compares with LESS_THAN and does not count the start node', () => {
    // A triangle: each node has 2 neighbours, and reaches itself at 2 hops
    const net = network(
      ['n1', 'n2', 'n3'],
      [
        ['e1', 'n1', 'n2'],
        ['e2', 'n2', 'n3'],
        ['e3', 'n3', 'n1'],
      ],
    )
    const ctx = () => createFilterContext(net, EMPTY, EMPTY)
    const lessThan3 = topology({
      predicate: P.LESS_THAN,
      threshold: 3,
      distance: 5,
    })
    expect(accepts(ctx(), lessThan3, 'n1', NODE)).toBe(true)
    expect(accepts(ctx(), { ...lessThan3, threshold: 2 }, 'n1', NODE)).toBe(
      false,
    )
  })

  it('rejects every node without distance and threshold', () => {
    const ctx = createFilterContext(network(['n1']), EMPTY, EMPTY)
    expect(accepts(ctx, topology({ threshold: 0 }), 'n1', NODE)).toBe(false)
    expect(accepts(ctx, topology({ distance: 1 }), 'n1', NODE)).toBe(false)
  })

  it('counts no neighbour when its conditions can never match', () => {
    const net = network(['n1', 'n2'], [['e1', 'n1', 'n2']])
    const ctx = createFilterContext(net, EMPTY, EMPTY)
    const node = topology({
      threshold: 1,
      distance: 1,
      children: [createColumnFilter()],
    })
    expect(accepts(ctx, node, 'n1', NODE)).toBe(false)
    expect(accepts(ctx, { ...node, predicate: P.LESS_THAN }, 'n1', NODE)).toBe(
      true,
    )
  })
})

describe('appliesTo', () => {
  it('follows the target of a column condition', () => {
    const nodes = column('x', P.IS, 'a')
    expect(appliesTo(nodes, NODE)).toBe(true)
    expect(appliesTo(nodes, EDGE)).toBe(false)
    const both = { ...nodes, target: ColumnFilterTarget.NODES_AND_EDGES }
    expect(appliesTo(both, EDGE)).toBe(true)
  })

  it('applies degree and topology conditions to nodes only', () => {
    expect(appliesTo(createDegreeFilter(), EDGE)).toBe(false)
    expect(appliesTo(createTopologyFilter(), NODE)).toBe(true)
  })

  it('applies a group when any condition applies, and an empty one never', () => {
    expect(appliesTo(createCompositeFilter(), NODE)).toBe(false)
    const group = createCompositeFilter(MatchType.ALL, [
      createDegreeFilter(),
      column('x', P.IS, 'a', { target: ColumnFilterTarget.EDGES }),
    ])
    expect(appliesTo(group, NODE)).toBe(true)
    expect(appliesTo(group, EDGE)).toBe(true)
  })
})

describe('evaluateFilter', () => {
  const net = network(
    ['n1', 'n2', 'n3'],
    [
      ['e1', 'n1', 'n2'],
      ['e2', 'n2', 'n3'],
    ],
  )
  const nodeTable = table(
    { score: 'double' },
    { n1: { score: 1 }, n2: { score: 5 }, n3: { score: 9 } },
  )
  const edgeTable = table(
    { interaction: 'string' },
    { e1: { interaction: 'pp' }, e2: { interaction: 'pd' } },
  )
  const ctx = () => createFilterContext(net, nodeTable, edgeTable)
  const nodeFilter = createCompositeFilter(MatchType.ALL, [
    column('score', P.GREATER_THAN, 4),
  ])
  const edgeFilter = createCompositeFilter(MatchType.ALL, [
    column('interaction', P.IS, 'pp', { target: ColumnFilterTarget.EDGES }),
  ])

  it('selects the elements that pass; a node filter selects no edge', () => {
    expect(evaluateFilter(ctx(), nodeFilter, DisplayMode.SELECT)).toEqual({
      nodeIds: ['n2', 'n3'],
      edgeIds: [],
    })
  })

  it('keeps the elements a filter is not about visible in show mode', () => {
    expect(evaluateFilter(ctx(), nodeFilter, DisplayMode.SHOW_HIDE)).toEqual({
      nodeIds: ['n2', 'n3'],
      edgeIds: ['e1', 'e2'],
    })
    expect(evaluateFilter(ctx(), edgeFilter, DisplayMode.SHOW_HIDE)).toEqual({
      nodeIds: ['n1', 'n2', 'n3'],
      edgeIds: ['e1'],
    })
  })

  it('returns undefined for a filter without conditions', () => {
    expect(
      evaluateFilter(ctx(), createCompositeFilter(), DisplayMode.SELECT),
    ).toBeUndefined()
  })
})
