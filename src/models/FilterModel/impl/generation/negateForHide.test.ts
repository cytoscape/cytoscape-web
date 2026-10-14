// @vitest-environment node
import { describe, expect, it } from 'vitest'

import type { IdType } from '../../../IdType'
import type { Network } from '../../../NetworkModel/Network'
import type { Table } from '../../../TableModel/Table'
import type { ValueType } from '../../../TableModel/ValueType'
import type { ValueTypeName } from '../../../TableModel/ValueTypeName'
import {
  ColumnFilterCriterion,
  ColumnFilterNode,
  ColumnFilterTarget,
  CompositeFilterNode,
  DegreeEdgeType,
  FilterElementKind,
  FilterNode,
  FilterPredicate,
  MatchType,
} from '../../FilterTree'
import { accepts, createFilterContext } from '../evaluateFilter'
import {
  createColumnFilter,
  createCompositeFilter,
  createDegreeFilter,
  createTopologyFilter,
} from '../filterTreeImpl'
import { negateForHide } from './negateForHide'

const P = FilterPredicate
const NODE = FilterElementKind.NODE
const EDGE = FilterElementKind.EDGE

const table = (
  columns: Record<string, ValueTypeName>,
  rows: Record<IdType, Record<string, ValueType>> = {},
): Table => ({
  id: 'table',
  columns: Object.entries(columns).map(([name, type]) => ({ name, type })),
  rows: new Map(Object.entries(rows)),
})

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

const group = (...children: FilterNode[]): CompositeFilterNode =>
  createCompositeFilter(MatchType.ALL, children)

// A small network with every kind of value, missing ones included:
// a - b - c - d, and e alone
const NETWORK: Network = {
  id: 'net',
  nodes: ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id })),
  edges: [
    { id: 'ab', s: 'a', t: 'b' },
    { id: 'bc', s: 'b', t: 'c' },
    { id: 'cd', s: 'c', t: 'd' },
  ],
}

const NODE_TABLE = table(
  {
    name: 'string',
    score: 'double',
    hub: 'boolean',
    go: 'list_of_string',
    counts: 'list_of_integer',
  },
  {
    a: {
      name: 'TP53 kinase',
      score: 0.9,
      hub: true,
      go: ['kinase', 'x'],
      counts: [1, 5],
    },
    b: { name: 'EGFR', score: 0.1, hub: false, go: [], counts: [] },
    c: { name: 'BRCA1', go: ['y'], counts: [7] },
    d: {
      name: 'MAP kinase',
      score: 0.5,
      hub: true,
      go: ['kinase'],
      counts: [2],
    },
    e: {},
  },
)

const EDGE_TABLE = table(
  { interaction: 'string', weight: 'double' },
  {
    ab: { interaction: 'pp', weight: 3 },
    bc: { interaction: 'pd' },
    cd: { interaction: 'pp', weight: 0.5 },
  },
)

const passing = (
  root: FilterNode,
  kind: typeof NODE | typeof EDGE,
): IdType[] => {
  const ctx = createFilterContext(NETWORK, NODE_TABLE, EDGE_TABLE)
  const ids = (kind === NODE ? NETWORK.nodes : NETWORK.edges).map(
    ({ id }) => id,
  )
  return ids.filter((id) => accepts(ctx, root, id, kind))
}

const all = (kind: typeof NODE | typeof EDGE): IdType[] =>
  (kind === NODE ? NETWORK.nodes : NETWORK.edges).map(({ id }) => id)

/** The negation keeps visible exactly what the original does not pass */
const expectComplement = (
  root: CompositeFilterNode,
  kind: typeof NODE | typeof EDGE = NODE,
  // Elements of a documented exception, tested on their own
  except: IdType[] = [],
): void => {
  const negated = negateForHide(root)
  expect(negated).toBeDefined()
  const keep = (id: IdType): boolean => !except.includes(id)
  const hidden = passing(root, kind).filter(keep)
  const shown = passing(negated!, kind).filter(keep)
  expect([...hidden, ...shown].sort()).toEqual(all(kind).filter(keep))
  expect(hidden.filter((id) => shown.includes(id))).toEqual([])
}

describe('negateForHide', () => {
  describe('rewrites each condition to its opposite', () => {
    it.each([
      [P.IS, P.IS_NOT],
      [P.IS_NOT, P.IS],
      [P.CONTAINS, P.DOES_NOT_CONTAIN],
      [P.DOES_NOT_CONTAIN, P.CONTAINS],
    ])('text %s becomes %s and flips anyMatch', (from, to) => {
      const negated = negateForHide(group(column('name', from, 'x')))
      expect(negated?.children[0]).toMatchObject({
        predicate: to,
        criterion: 'x',
        anyMatch: false,
      })
    })

    it.each([
      [P.BETWEEN, P.IS_NOT_BETWEEN],
      [P.IS_NOT_BETWEEN, P.BETWEEN],
    ])('number %s becomes %s', (from, to) => {
      const negated = negateForHide(group(column('score', from, [0, 1])))
      expect(negated?.children[0]).toMatchObject({
        predicate: to,
        criterion: [0, 1],
      })
    })

    it('flips the value of a boolean condition and keeps IS', () => {
      const negated = negateForHide(group(column('hub', P.IS, true)))
      expect(negated?.children[0]).toMatchObject({
        predicate: P.IS,
        criterion: false,
      })
    })

    it('turns the comparison of a degree condition around', () => {
      const negated = negateForHide(
        group({ ...createDegreeFilter(), criterion: [2, 5] }),
      )
      expect(negated?.children[0]).toMatchObject({
        predicate: P.IS_NOT_BETWEEN,
        criterion: [2, 5],
      })
    })

    it('turns the count of a topology condition around, not its neighbours', () => {
      const neighbour = column('name', P.CONTAINS, 'kinase')
      const negated = negateForHide(
        group({
          ...createTopologyFilter(),
          distance: 1,
          threshold: 1,
          children: [neighbour],
        }),
      )
      expect(negated?.children[0]).toMatchObject({
        predicate: P.LESS_THAN,
        matchType: MatchType.ALL,
        children: [neighbour],
      })
    })

    it('swaps ALL and ANY by De Morgan', () => {
      const negated = negateForHide(
        createCompositeFilter(MatchType.ANY, [
          group(column('name', P.IS, 'x'), column('name', P.IS, 'y')),
        ]),
      )
      expect(negated?.matchType).toBe(MatchType.ALL)
      expect(negated?.children[0]).toMatchObject({ matchType: MatchType.ANY })
    })

    it('leaves its input untouched', () => {
      const root = group(column('name', P.IS, 'x'))
      const before = JSON.stringify(root)
      negateForHide(root)
      expect(JSON.stringify(root)).toBe(before)
    })
  })

  it('refuses conditions without an opposite', () => {
    expect(negateForHide(group(column('name', P.REGEX, 'x')))).toBeUndefined()
    expect(
      negateForHide(group(column('score', P.GREATER_THAN, [1, 1]))),
    ).toBeUndefined()
    expect(
      negateForHide(
        group({
          ...createTopologyFilter(),
          predicate: P.GREATER_THAN,
          distance: 1,
          threshold: 1,
        }),
      ),
    ).toBeUndefined()
  })

  describe('shows exactly the elements the original filter does not pass', () => {
    it.each([
      ['text IS', group(column('name', P.IS, 'egfr'))],
      ['text CONTAINS', group(column('name', P.CONTAINS, 'kinase'))],
      [
        'text DOES_NOT_CONTAIN',
        group(column('name', P.DOES_NOT_CONTAIN, 'kinase')),
      ],
      // c and e have no score
      ['number BETWEEN', group(column('score', P.BETWEEN, [0.4, 1]))],
      [
        'number IS_NOT_BETWEEN',
        group(column('score', P.IS_NOT_BETWEEN, [0.4, 1])),
      ],
      [
        'degree',
        group({
          ...createDegreeFilter(),
          edgeType: DegreeEdgeType.ANY,
          criterion: [2, 2],
        }),
      ],
      [
        'topology',
        group({
          ...createTopologyFilter(),
          distance: 2,
          threshold: 1,
          children: [column('name', P.CONTAINS, 'kinase')],
        }),
      ],
      [
        'nested groups',
        createCompositeFilter(MatchType.ANY, [
          group(
            column('name', P.CONTAINS, 'kinase'),
            column('score', P.BETWEEN, [0.6, 1]),
          ),
          group({ ...createDegreeFilter(), criterion: [0, 0] }),
        ]),
      ],
    ])('%s', (_, root) => {
      expectComplement(root)
    })

    // e has no list at all: the second documented exception below
    it.each([
      ['any list element', column('go', P.IS, 'kinase', { anyMatch: true })],
      [
        'every list element',
        column('counts', P.BETWEEN, [1, 5], { anyMatch: false }),
      ],
    ])('%s', (_, condition) => {
      expectComplement(group(condition), NODE, ['e'])
    })

    it('for edge conditions', () => {
      expectComplement(
        createCompositeFilter(MatchType.ANY, [
          column('interaction', P.IS, 'pd', {
            target: ColumnFilterTarget.EDGES,
          }),
          column('weight', P.BETWEEN, [2, 10], {
            target: ColumnFilterTarget.EDGES,
          }),
        ]),
        EDGE,
      )
    })
  })

  describe('the documented exceptions hide elements without a value', () => {
    it('in a boolean column', () => {
      const root = group(column('hub', P.IS, true))
      const negated = negateForHide(root)!
      expect(passing(root, NODE)).toEqual(['a', 'd'])
      // c and e have no "hub": neither filter passes them
      expect(passing(negated, NODE)).toEqual(['b'])
    })

    it('in a list column', () => {
      const root = group(column('go', P.IS, 'kinase'))
      const negated = negateForHide(root)!
      expect(passing(root, NODE)).toEqual(['a', 'd'])
      // e has no list; b's empty list passes "every element is not kinase"
      expect(passing(negated, NODE)).toEqual(['b', 'c'])
    })
  })
})
