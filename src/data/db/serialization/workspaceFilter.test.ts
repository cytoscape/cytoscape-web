// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { DisplayMode } from '../../../models/FilterModel/DisplayMode'
import {
  FilterPredicate,
  MatchType,
  WorkspaceFilter,
} from '../../../models/FilterModel/FilterTree'
import {
  createColumnFilter,
  createCompositeFilter,
  createTopologyFilter,
} from '../../../models/FilterModel/impl/filterTreeImpl'
import {
  deserializeWorkspaceFilter,
  serializeWorkspaceFilter,
} from './workspaceFilter'

const filter: WorkspaceFilter = {
  id: 'f1',
  name: 'Hubs',
  displayMode: DisplayMode.SHOW_HIDE,
  root: createCompositeFilter(MatchType.ANY, [
    {
      ...createColumnFilter(),
      columnName: 'score',
      predicate: FilterPredicate.BETWEEN,
      criterion: [1, 2],
    },
    {
      ...createTopologyFilter(),
      distance: 2,
      threshold: 3,
      children: [createCompositeFilter()],
    },
  ]),
}

describe('workspace filter rows', () => {
  it('stores the filter as an entry of a Cytoscape Desktop filter file', () => {
    const row = serializeWorkspaceFilter(filter)
    expect(row.id).toBe('f1')
    expect(row.displayMode).toBe(DisplayMode.SHOW_HIDE)
    expect(row.filter.name).toBe('Hubs')
    expect(row.filter.transformers).toHaveLength(1)
    expect(row.filter.transformers[0]).toMatchObject({
      id: 'org.cytoscape.CompositeFilter',
      parameters: { type: 'ANY' },
    })
  })

  it('reads a row back unchanged, also after a JSON round trip', () => {
    const row = serializeWorkspaceFilter(filter)
    expect(deserializeWorkspaceFilter(row)).toEqual(filter)
    expect(deserializeWorkspaceFilter(JSON.parse(JSON.stringify(row)))).toEqual(
      filter,
    )
  })

  it('rejects a malformed envelope', () => {
    const row = serializeWorkspaceFilter(filter)
    expect(() => deserializeWorkspaceFilter({ ...row, id: '' })).toThrow()
    expect(() =>
      deserializeWorkspaceFilter({ ...row, id: '__proto__' }),
    ).toThrow()
    expect(() =>
      deserializeWorkspaceFilter({ ...row, displayMode: 'hide' }),
    ).toThrow()
    expect(() => deserializeWorkspaceFilter(null)).toThrow()
  })

  it('rejects a filter the parser cannot read', () => {
    const row = serializeWorkspaceFilter(filter)
    expect(() =>
      deserializeWorkspaceFilter({ ...row, filter: undefined }),
    ).toThrow()
    expect(() =>
      deserializeWorkspaceFilter({
        ...row,
        filter: {
          name: 'X',
          transformers: [{ id: 'com.example.Foo', parameters: {} }],
        },
      }),
    ).toThrow('Unknown filter "com.example.Foo"')
  })
})
