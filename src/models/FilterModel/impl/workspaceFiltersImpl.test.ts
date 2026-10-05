// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { DisplayMode } from '../DisplayMode'
import { MatchType, NamedFilter, WorkspaceFilter } from '../FilterTree'
import {
  createCompositeFilter,
  createDegreeFilter,
  createWorkspaceFilter,
} from './filterTreeImpl'
import {
  copyWorkspaceFilter,
  DEFAULT_FILTER_NAME,
  FilterNameError,
  getWorkspaceFilter,
  importWorkspaceFilters,
  newWorkspaceFilter,
  renameWorkspaceFilter,
  WorkspaceFilters,
} from './workspaceFiltersImpl'

const byId = (...filters: WorkspaceFilter[]): WorkspaceFilters =>
  Object.fromEntries(filters.map((filter) => [filter.id, filter]))

const hubs: WorkspaceFilter = {
  ...createWorkspaceFilter('f1', 'Hubs', DisplayMode.SHOW_HIDE),
  root: createCompositeFilter(MatchType.ANY, [createDegreeFilter()]),
}
const filters = byId(hubs, createWorkspaceFilter('f2', 'Kinases'))

describe('getWorkspaceFilter', () => {
  it('finds own entries only', () => {
    expect(getWorkspaceFilter(filters, 'f1')).toBe(hubs)
    expect(getWorkspaceFilter(filters, 'constructor')).toBeUndefined()
    expect(getWorkspaceFilter(filters, 'nope')).toBeUndefined()
  })
})

describe('newWorkspaceFilter', () => {
  it('creates an empty filter in select mode', () => {
    expect(newWorkspaceFilter(filters, 'f3', 'Scores')).toEqual(
      createWorkspaceFilter('f3', 'Scores'),
    )
  })

  it('trims the name, numbers a taken one and names a blank one', () => {
    expect(newWorkspaceFilter(filters, 'f3', '  hubs ').name).toBe('hubs 2')
    expect(newWorkspaceFilter(filters, 'f3', ' ').name).toBe(
      DEFAULT_FILTER_NAME,
    )
  })
})

describe('renameWorkspaceFilter', () => {
  it('renames a filter', () => {
    expect(renameWorkspaceFilter(filters, 'f1', ' Big hubs ')).toEqual({
      success: true,
      filter: { ...hubs, name: 'Big hubs' },
    })
  })

  it('allows changing only the case of its own name', () => {
    expect(renameWorkspaceFilter(filters, 'f1', 'HUBS')).toMatchObject({
      success: true,
      filter: { name: 'HUBS' },
    })
  })

  it('refuses a blank, taken or unknown name', () => {
    expect(renameWorkspaceFilter(filters, 'f1', '  ')).toEqual({
      success: false,
      error: FilterNameError.EMPTY,
    })
    expect(renameWorkspaceFilter(filters, 'f1', 'kinases')).toEqual({
      success: false,
      error: FilterNameError.TAKEN,
    })
    expect(renameWorkspaceFilter(filters, 'nope', 'X')).toEqual({
      success: false,
      error: FilterNameError.NOT_FOUND,
    })
  })
})

describe('copyWorkspaceFilter', () => {
  it('copies a filter under a new id and a numbered name', () => {
    expect(copyWorkspaceFilter(filters, 'f1', 'f3')).toEqual({
      ...hubs,
      id: 'f3',
      name: 'Hubs 2',
    })
    expect(copyWorkspaceFilter(filters, 'nope', 'f3')).toBeUndefined()
  })
})

describe('importWorkspaceFilters', () => {
  it('adds filters under new ids and free names, in select mode', () => {
    const imported: NamedFilter[] = [
      { name: 'Hubs', root: hubs.root },
      { name: 'Hubs', root: createCompositeFilter() },
      { name: 'New', root: createCompositeFilter() },
    ]
    let next = 0
    const added = importWorkspaceFilters(filters, imported, () => `i${++next}`)
    expect(added).toEqual([
      {
        id: 'i1',
        name: 'Hubs 2',
        root: hubs.root,
        displayMode: DisplayMode.SELECT,
      },
      {
        id: 'i2',
        name: 'Hubs 3',
        root: createCompositeFilter(),
        displayMode: DisplayMode.SELECT,
      },
      {
        id: 'i3',
        name: 'New',
        root: createCompositeFilter(),
        displayMode: DisplayMode.SELECT,
      },
    ])
  })
})
