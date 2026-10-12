// @vitest-environment node
import { describe, expect, it } from 'vitest'

import type { Table } from '../../TableModel/Table'
import type { ValueType } from '../../TableModel/ValueType'
import { DisplayMode } from '../DisplayMode'
import {
  ColumnFilterTarget,
  CompositeFilterNode,
  FilterNode,
  TopologyFilterNode,
  DegreeEdgeType,
  FilterPredicate,
  FilterTypeId,
  MatchType,
} from '../FilterTree'
import {
  appendChild,
  canDropCondition,
  columnFilterFor,
  computeColumnRange,
  computeDegreeRange,
  createColumnFilter,
  createCompositeFilter,
  createDegreeFilter,
  createTopologyFilter,
  ConditionDropTarget,
  createWorkspaceFilter,
  getNodeAt,
  isNameTaken,
  moveCondition,
  normalizeFilterName,
  removeNodeAt,
  replaceNodeAt,
  setMatchType,
  uniqueFilterName,
  wrapInGroup,
} from './filterTreeImpl'

describe('new conditions', () => {
  it('use Cytoscape Desktop defaults', () => {
    expect(createColumnFilter()).toEqual({
      type: FilterTypeId.Column,
      columnName: null,
      target: ColumnFilterTarget.NODES,
      predicate: null,
      criterion: null,
      caseSensitive: false,
      anyMatch: true,
    })
    expect(createDegreeFilter()).toMatchObject({
      edgeType: DegreeEdgeType.ANY,
      predicate: FilterPredicate.BETWEEN,
      criterion: null,
    })
    expect(createTopologyFilter()).toMatchObject({
      predicate: FilterPredicate.GREATER_THAN_OR_EQUAL,
      distance: null,
      threshold: null,
      matchType: MatchType.ALL,
      children: [],
    })
  })

  it('start a workspace filter empty, in select mode', () => {
    expect(createWorkspaceFilter('f1', 'My filter')).toEqual({
      id: 'f1',
      name: 'My filter',
      root: createCompositeFilter(),
      displayMode: DisplayMode.SELECT,
    })
  })
})

describe('columnFilterFor', () => {
  it('picks the defaults for the column type', () => {
    expect(
      columnFilterFor({ name: 'b', type: 'boolean' }, ColumnFilterTarget.NODES),
    ).toMatchObject({ columnName: 'b', predicate: 'IS', criterion: true })
    expect(
      columnFilterFor({ name: 's', type: 'list_of_string' }, 'edges'),
    ).toMatchObject({
      columnName: 's',
      target: 'edges',
      predicate: 'CONTAINS',
      criterion: '',
    })
    expect(
      columnFilterFor({ name: 'd', type: 'double' }, 'nodes', {
        min: -1,
        max: 7,
      }),
    ).toMatchObject({ predicate: 'BETWEEN', criterion: [-1, 7] })
    expect(
      columnFilterFor({ name: 'i', type: 'integer' }, 'nodes'),
    ).toMatchObject({ predicate: 'BETWEEN', criterion: [0, 0] })
  })
})

describe('edits by path', () => {
  const a = createDegreeFilter()
  const b = createColumnFilter()
  const tree: CompositeFilterNode = createCompositeFilter(MatchType.ALL, [
    a,
    createCompositeFilter(MatchType.ANY, [b]),
    { ...createTopologyFilter(), children: [b] },
  ])

  it('finds a condition by path', () => {
    expect(getNodeAt(tree, [])).toBe(tree)
    expect(getNodeAt(tree, [0])).toBe(a)
    expect(getNodeAt(tree, [1, 0])).toBe(b)
    expect(getNodeAt(tree, [2, 0])).toBe(b)
    expect(getNodeAt(tree, [0, 0])).toBeUndefined()
    expect(getNodeAt(tree, [7])).toBeUndefined()
  })

  it('replaces a condition and leaves the input untouched', () => {
    const replaced = replaceNodeAt(tree, [1, 0], a)
    expect(getNodeAt(replaced, [1, 0])).toBe(a)
    expect(getNodeAt(tree, [1, 0])).toBe(b)
    // The root can only become another group
    expect(replaceNodeAt(tree, [], a)).toBe(tree)
  })

  it('appends to a group or a topology condition', () => {
    expect(getNodeAt(appendChild(tree, [], b), [3])).toBe(b)
    expect(getNodeAt(appendChild(tree, [2], a), [2, 1])).toBe(a)
    // Not a parent: unchanged
    expect(appendChild(tree, [0], b)).toEqual(tree)
  })

  it('sets the match type', () => {
    expect(setMatchType(tree, [], MatchType.ANY).matchType).toBe(MatchType.ANY)
    expect(
      getNodeAt(setMatchType(tree, [2], MatchType.ANY), [2]),
    ).toMatchObject({ matchType: MatchType.ANY })
  })

  it('wraps a condition in a new group', () => {
    const wrapped = wrapInGroup(tree, [0], MatchType.ANY)
    expect(getNodeAt(wrapped, [0])).toEqual(
      createCompositeFilter(MatchType.ANY, [a]),
    )
  })

  it('removes a condition and the groups it leaves empty', () => {
    const nested = createCompositeFilter(MatchType.ALL, [
      a,
      createCompositeFilter(MatchType.ANY, [
        createCompositeFilter(MatchType.ALL, [b]),
      ]),
      createCompositeFilter(MatchType.ALL),
    ])
    const removed = removeNodeAt(nested, [1, 0, 0])
    // Both nested groups emptied by the removal go; the unrelated empty
    // group stays
    expect(removed.children).toEqual([a, createCompositeFilter(MatchType.ALL)])
  })

  it('keeps an emptied topology condition and the root', () => {
    expect(getNodeAt(removeNodeAt(tree, [2, 0]), [2])).toMatchObject({
      type: FilterTypeId.Topology,
      children: [],
    })
    const single = createCompositeFilter(MatchType.ALL, [a])
    expect(removeNodeAt(single, [0])).toEqual(createCompositeFilter())
    expect(removeNodeAt(single, [])).toBe(single)
    expect(removeNodeAt(single, [5])).toBe(single)
  })
})

describe('names', () => {
  it('compares names ignoring case', () => {
    expect(isNameTaken(['Default filter'], 'default FILTER')).toBe(true)
    expect(isNameTaken(['Default filter'], 'Other')).toBe(false)
  })

  it('appends the first free number to a taken name', () => {
    expect(uniqueFilterName([], 'X')).toBe('X')
    expect(uniqueFilterName(['X'], 'X')).toBe('X 2')
    expect(uniqueFilterName(['x', 'X 2'], 'X')).toBe('X 3')
  })

  it('trims names and rejects blank ones', () => {
    expect(normalizeFilterName('  A  ')).toBe('A')
    expect(normalizeFilterName('   ')).toBeUndefined()
  })
})

describe('ranges', () => {
  it('finds the numeric range of a column, list elements included', () => {
    const table: Table = {
      id: 't',
      columns: [{ name: 'v', type: 'double' }],
      rows: new Map<string, Record<string, ValueType>>([
        ['1', { v: 3 }],
        ['2', { v: NaN }],
        ['3', { v: Infinity }],
        ['4', {}],
        ['5', { v: [-2, 10] }],
        ['6', { v: 'text' }],
      ]),
    }
    expect(computeColumnRange(table, 'v')).toEqual({ min: -2, max: 10 })
    expect(computeColumnRange(table, 'missing')).toBeUndefined()
  })

  it('finds the degree range of a network', () => {
    const network = {
      id: 'n',
      nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      edges: [
        { id: 'e1', s: 'a', t: 'b' },
        { id: 'e2', s: 'a', t: 'c' },
      ],
    }
    expect(computeDegreeRange(network, DegreeEdgeType.ANY)).toEqual({
      min: 1,
      max: 2,
    })
    expect(computeDegreeRange(network, DegreeEdgeType.INCOMING)).toEqual({
      min: 0,
      max: 1,
    })
    expect(
      computeDegreeRange({ id: 'e', nodes: [], edges: [] }, DegreeEdgeType.ANY),
    ).toEqual({ min: 0, max: 0 })
  })
})

describe('moveCondition (drag and drop)', () => {
  // Distinct conditions, told apart by their column
  const c = (name: string) => ({ ...createColumnFilter(), columnName: name })
  const names = (node: FilterNode): unknown =>
    node.type === FilterTypeId.Column
      ? node.columnName
      : isParent(node)
        ? node.children.map(names)
        : node.type
  const isParent = (
    node: FilterNode,
  ): node is CompositeFilterNode | TopologyFilterNode => 'children' in node
  const tree = (): CompositeFilterNode =>
    createCompositeFilter(MatchType.ALL, [
      c('a'),
      c('b'),
      createCompositeFilter(MatchType.ANY, [c('x'), c('y')]),
      { ...createTopologyFilter(), children: [c('t')] },
    ])

  it('moves a condition into a gap, in the same group or another', () => {
    expect(
      names(
        moveCondition(tree(), [0], { kind: 'gap', parentPath: [], index: 2 }),
      ),
    ).toEqual(['b', 'a', ['x', 'y'], ['t']])
    expect(
      names(
        moveCondition(tree(), [1], { kind: 'gap', parentPath: [], index: 0 }),
      ),
    ).toEqual(['b', 'a', ['x', 'y'], ['t']])
    expect(
      names(
        moveCondition(tree(), [0], { kind: 'gap', parentPath: [2], index: 1 }),
      ),
    ).toEqual(['b', ['x', 'a', 'y'], ['t']])
    // To the end of the root, out of a nested group
    expect(
      names(
        moveCondition(tree(), [2, 0], {
          kind: 'gap',
          parentPath: [],
          index: 4,
        }),
      ),
    ).toEqual(['a', 'b', ['y'], ['t'], 'x'])
  })

  it('adds a condition at the end of a group or a topology condition', () => {
    expect(
      names(moveCondition(tree(), [0], { kind: 'group', path: [2] })),
    ).toEqual(['b', ['x', 'y', 'a'], ['t']])
    expect(
      names(moveCondition(tree(), [1], { kind: 'group', path: [3] })),
    ).toEqual(['a', ['x', 'y'], ['t', 'b']])
  })

  it('groups a condition dropped on another, the target first', () => {
    const moved = moveCondition(tree(), [0], { kind: 'condition', path: [1] })
    expect(names(moved)).toEqual([['b', 'a'], ['x', 'y'], ['t']])
    expect(moved.children[0]).toMatchObject({
      type: FilterTypeId.Composite,
      matchType: MatchType.ALL,
    })
    // A condition from a nested group onto one after it in the root
    expect(
      names(moveCondition(tree(), [2, 1], { kind: 'condition', path: [1] })),
    ).toEqual(['a', ['b', 'y'], ['x'], ['t']])
  })

  it('removes the groups a move empties, but not a topology condition', () => {
    const nested = createCompositeFilter(MatchType.ALL, [
      c('a'),
      createCompositeFilter(MatchType.ANY, [
        createCompositeFilter(MatchType.ALL, [c('x')]),
      ]),
      { ...createTopologyFilter(), children: [c('t')] },
    ])
    expect(
      names(
        moveCondition(nested, [1, 0, 0], {
          kind: 'gap',
          parentPath: [],
          index: 0,
        }),
      ),
    ).toEqual(['x', 'a', ['t']])
    expect(
      names(
        moveCondition(nested, [2, 0], {
          kind: 'gap',
          parentPath: [],
          index: 0,
        }),
      ),
    ).toEqual(['t', 'a', [['x']], []])
  })

  it('refuses drops that would change nothing or are impossible', () => {
    const root = tree()
    const refused: [number[], ConditionDropTarget][] = [
      // The root, and paths that lead nowhere
      [[], { kind: 'group', path: [2] }],
      [[9], { kind: 'group', path: [2] }],
      // Next to itself
      [[1], { kind: 'gap', parentPath: [], index: 1 }],
      [[1], { kind: 'gap', parentPath: [], index: 2 }],
      // Into itself
      [[2], { kind: 'group', path: [2] }],
      [[2], { kind: 'gap', parentPath: [2], index: 0 }],
      [[2], { kind: 'condition', path: [2, 0] }],
      // Onto itself, or a target of the wrong kind
      [[0], { kind: 'condition', path: [0] }],
      [[0], { kind: 'condition', path: [2] }],
      [[0], { kind: 'group', path: [1] }],
      // Already last in its own group
      [[2, 1], { kind: 'group', path: [2] }],
      // Gaps out of range
      [[0], { kind: 'gap', parentPath: [], index: 5 }],
      [[0], { kind: 'gap', parentPath: [], index: -1 }],
    ]
    refused.forEach(([source, target]) => {
      expect(canDropCondition(root, source, target)).toBe(false)
      expect(moveCondition(root, source, target)).toBe(root)
    })
    expect(canDropCondition(root, [2, 0], { kind: 'group', path: [2] })).toBe(
      true,
    )
  })

  it('leaves the input untouched', () => {
    const root = tree()
    const before = JSON.stringify(root)
    moveCondition(root, [0], { kind: 'condition', path: [1] })
    expect(JSON.stringify(root)).toBe(before)
  })
})
