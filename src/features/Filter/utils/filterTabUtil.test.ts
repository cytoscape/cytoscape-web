// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { DisplayMode } from '@/models/FilterModel/DisplayMode'
import { FilterPredicate } from '@/models/FilterModel/FilterTree'
import { createWorkspaceFilter } from '@/models/FilterModel/impl/filterTreeImpl'
import type { Table } from '@/models/TableModel/Table'

import {
  AUTO_APPLY_ELEMENT_LIMIT,
  defaultAutoApply,
  formatApplyStatus,
  listColumnOptions,
  numericPredicateOptions,
  roundForDisplay,
  sortFiltersByName,
  toRangeCriterion,
  warningsByPath,
} from './filterTabUtil'

const table = (names: string[]): Table => ({
  id: 't',
  columns: names.map((name) => ({ name, type: 'string' })),
  rows: new Map(),
})

describe('listColumnOptions', () => {
  it('lists node columns, then edge columns, each sorted ignoring case', () => {
    const options = listColumnOptions(
      table(['score', 'Name', 'alias']),
      table(['weight', 'interaction']),
    )
    expect(options.map((option) => option.label)).toEqual([
      'Node: alias',
      'Node: Name',
      'Node: score',
      'Edge: interaction',
      'Edge: weight',
    ])
    expect(options[0]).toMatchObject({ key: 'nodes:alias', target: 'nodes' })
  })
})

describe('sortFiltersByName', () => {
  it('sorts ignoring case', () => {
    const sorted = sortFiltersByName([
      createWorkspaceFilter('1', 'b'),
      createWorkspaceFilter('2', 'C'),
      createWorkspaceFilter('3', 'A'),
    ])
    expect(sorted.map((filter) => filter.name)).toEqual(['A', 'b', 'C'])
  })
})

describe('defaultAutoApply', () => {
  it('is on below the element limit', () => {
    const nodes = Array.from({ length: AUTO_APPLY_ELEMENT_LIMIT }, (_, i) => ({
      id: `${i}`,
    }))
    expect(defaultAutoApply({ id: 'n', nodes: [], edges: [] })).toBe(true)
    expect(defaultAutoApply({ id: 'n', nodes, edges: [] })).toBe(false)
    expect(defaultAutoApply(undefined)).toBe(true)
  })
})

describe('warningsByPath', () => {
  it('groups warnings by condition', () => {
    const grouped = warningsByPath([
      { path: [0], message: 'a' },
      { path: [1, 0], message: 'b' },
      { path: [0], message: 'c' },
    ])
    expect(grouped.get('0')).toEqual(['a', 'c'])
    expect(grouped.get('1.0')).toEqual(['b'])
  })
})

describe('formatApplyStatus', () => {
  const result = {
    success: true as const,
    applied: true,
    nodeCount: 1,
    edgeCount: 3,
    elapsedMs: 4.4,
  }

  it('describes what was selected or shown', () => {
    expect(
      formatApplyStatus({ ...result, displayMode: DisplayMode.SELECT }),
    ).toBe('Selected 1 node and 3 edges in 4 ms')
    expect(
      formatApplyStatus({ ...result, displayMode: DisplayMode.SHOW_HIDE }),
    ).toBe('Showing 1 node and 3 edges in 4 ms')
  })

  it('explains a filter that did nothing or failed', () => {
    expect(
      formatApplyStatus({
        ...result,
        applied: false,
        displayMode: DisplayMode.SELECT,
      }),
    ).toBe('Add a condition to apply the filter.')
    expect(
      formatApplyStatus({ success: false, error: 'network-not-found' }),
    ).toBe('The network is not loaded yet.')
  })
})

describe('roundForDisplay', () => {
  it('drops floating-point noise', () => {
    expect(roundForDisplay(0.1 + 0.2)).toBe(0.3)
    expect(roundForDisplay(123456789)).toBe(123457000)
  })
})

describe('numericPredicateOptions', () => {
  it('offers "is" and "is not" a range, as Cytoscape Desktop does', () => {
    expect(numericPredicateOptions(FilterPredicate.BETWEEN)).toEqual([
      [FilterPredicate.BETWEEN, 'is'],
      [FilterPredicate.IS_NOT_BETWEEN, 'is not'],
    ])
    expect(numericPredicateOptions(null)).toHaveLength(2)
  })

  it('keeps the single-value predicate of an imported condition listed', () => {
    expect(numericPredicateOptions(FilterPredicate.GREATER_THAN)).toEqual([
      [FilterPredicate.BETWEEN, 'is'],
      [FilterPredicate.IS_NOT_BETWEEN, 'is not'],
      [FilterPredicate.GREATER_THAN, 'is greater than'],
    ])
    // A text predicate on a numeric column is listed by its name
    expect(numericPredicateOptions(FilterPredicate.CONTAINS)[2]).toEqual([
      FilterPredicate.CONTAINS,
      'CONTAINS',
    ])
  })
})

describe('toRangeCriterion', () => {
  const bounds = { min: 0, max: 10 }

  it('keeps the side of the value a single-value condition accepted', () => {
    expect(toRangeCriterion(FilterPredicate.GREATER_THAN, 4, bounds)).toEqual([
      4, 10,
    ])
    expect(
      toRangeCriterion(FilterPredicate.LESS_THAN_OR_EQUAL, 4, bounds),
    ).toEqual([0, 4])
    expect(toRangeCriterion(FilterPredicate.IS, 4, bounds)).toEqual([4, 4])
  })

  it('stretches the range to a value outside the column bounds', () => {
    expect(
      toRangeCriterion(FilterPredicate.GREATER_THAN_OR_EQUAL, 12, bounds),
    ).toEqual([12, 12])
    expect(toRangeCriterion(FilterPredicate.LESS_THAN, -3, bounds)).toEqual([
      -3, -3,
    ])
  })
})
