// @vitest-environment node
import { describe, expect, it } from 'vitest'

import type { Table } from '../../TableModel/Table'
import type { ValueTypeName } from '../../TableModel/ValueTypeName'
import {
  ColumnFilterNode,
  ColumnFilterTarget,
  FilterPredicate,
  MatchType,
} from '../FilterTree'
import {
  createColumnFilter,
  createCompositeFilter,
  createTopologyFilter,
} from './filterTreeImpl'
import { validateFilter } from './validateFilter'

const table = (columns: Record<string, ValueTypeName>): Table => ({
  id: 't',
  columns: Object.entries(columns).map(([name, type]) => ({ name, type })),
  rows: new Map(),
})

const nodeTable = table({ name: 'string', score: 'double', flag: 'boolean' })
const edgeTable = table({ weights: 'list_of_double' })

const column = (overrides: Partial<ColumnFilterNode>): ColumnFilterNode => ({
  ...createColumnFilter(),
  ...overrides,
})

const messagesOf = (node: ColumnFilterNode): string[] =>
  validateFilter(
    createCompositeFilter(MatchType.ALL, [node]),
    nodeTable,
    edgeTable,
  ).map((warning) => warning.message)

describe('validateFilter', () => {
  it('accepts complete and incomplete conditions that fit the tables', () => {
    expect(messagesOf(createColumnFilter())).toEqual([])
    expect(messagesOf(column({ columnName: 'name', predicate: null }))).toEqual(
      [],
    )
    expect(
      messagesOf(
        column({
          columnName: 'score',
          predicate: FilterPredicate.BETWEEN,
          criterion: [0, 1],
        }),
      ),
    ).toEqual([])
    expect(
      messagesOf(
        column({
          columnName: 'weights',
          target: ColumnFilterTarget.EDGES,
          predicate: FilterPredicate.IS_NOT_BETWEEN,
          criterion: 3,
        }),
      ),
    ).toEqual([])
  })

  it('reports a missing column', () => {
    expect(messagesOf(column({ columnName: 'nope' }))).toEqual([
      'Node table does not have column "nope"',
    ])
    expect(
      messagesOf(
        column({ columnName: 'score', target: ColumnFilterTarget.EDGES }),
      ),
    ).toEqual(['Edge table does not have column "score"'])
  })

  it('reports a criterion or predicate that does not fit the column', () => {
    expect(
      messagesOf(
        column({
          columnName: 'score',
          predicate: FilterPredicate.CONTAINS,
          criterion: 'a',
        }),
      ),
    ).toEqual([
      'Column "score" in Node table is a Numeric column, which this condition cannot compare',
    ])
    expect(
      messagesOf(
        column({
          columnName: 'name',
          predicate: FilterPredicate.BETWEEN,
          criterion: 'a',
        }),
      ),
    ).toEqual([
      'Column "name" in Node table is a String column, which this condition cannot compare',
    ])
    expect(
      messagesOf(
        column({
          columnName: 'flag',
          predicate: FilterPredicate.IS,
          criterion: 'true',
        }),
      ),
    ).toEqual([
      'Column "flag" in Node table is a Boolean column, which this condition cannot compare',
    ])
  })

  it('reports an invalid regular expression', () => {
    const [message] = messagesOf(
      column({
        columnName: 'name',
        predicate: FilterPredicate.REGEX,
        criterion: '(',
      }),
    )
    expect(message).toMatch(/^Invalid regular expression: /)
  })

  it('does not check a condition on both tables', () => {
    expect(
      messagesOf(
        column({
          columnName: 'nope',
          target: ColumnFilterTarget.NODES_AND_EDGES,
        }),
      ),
    ).toEqual([])
  })

  it('reports bad topology settings and checks neighbour conditions', () => {
    const warnings = validateFilter(
      createCompositeFilter(MatchType.ALL, [
        createColumnFilter(),
        {
          ...createTopologyFilter(),
          distance: 0,
          threshold: -1,
          children: [column({ columnName: 'nope' })],
        },
      ]),
      nodeTable,
      edgeTable,
    )
    expect(warnings).toEqual([
      { path: [1], message: 'Distance must be at least 1' },
      { path: [1], message: 'Threshold must not be negative' },
      { path: [1, 0], message: 'Node table does not have column "nope"' },
    ])
  })
})
