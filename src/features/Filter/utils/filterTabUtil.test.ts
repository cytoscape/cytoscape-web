// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { DisplayMode } from '@/models/FilterModel/DisplayMode'
import { createWorkspaceFilter } from '@/models/FilterModel/impl/filterTreeImpl'
import type { Table } from '@/models/TableModel/Table'

import {
  AUTO_APPLY_ELEMENT_LIMIT,
  defaultAutoApply,
  formatApplyStatus,
  listColumnOptions,
  roundForDisplay,
  sortFiltersByName,
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
