// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'

import { logApi } from '../../../debug'
import { GraphObjectType } from '../../../models/NetworkModel'
import type { Table } from '../../../models/TableModel'
import type { FilterAspects } from '../model/FilterAspects'
import { createFilterFromAspect, findFilterAspect } from './getFilterAspect'

const tableWith = (rows: Record<string, Record<string, unknown>>): Table =>
  ({ rows: new Map(Object.entries(rows)) }) as unknown as Table

const nodeTable = tableWith({
  n1: { category: 'gene' },
  n2: { category: 'drug' },
})
const edgeTable = tableWith({
  e1: { type: 'binds' },
  e2: { type: 'activates' },
})

describe('createFilterFromAspect', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('builds a config from the entry, pulling values from the matching table', () => {
    const aspects = [
      {
        attributeName: 'type',
        appliesTo: GraphObjectType.EDGE,
        label: 'Edge type',
        filter: [],
      },
    ] as unknown as FilterAspects

    expect(
      createFilterFromAspect('net-1', aspects, nodeTable, edgeTable),
    ).toMatchObject({
      name: 'net-1',
      attributeName: 'type',
      target: GraphObjectType.EDGE,
      label: 'Edge type',
      range: { values: ['activates', 'binds'] },
    })
  })

  // #798: the panel shows one filter per subnetwork. Every entry used to be
  // registered under the subnetwork id, so each overwrote the previous one
  // and the LAST entry won without a warning.
  it('uses only the first entry and warns about the others', () => {
    const warn = vi.spyOn(logApi, 'warn').mockImplementation(() => undefined)
    const aspects = [
      {
        attributeName: 'type',
        appliesTo: GraphObjectType.EDGE,
        label: 'Edge type',
        filter: [],
      },
      {
        attributeName: 'category',
        appliesTo: GraphObjectType.NODE,
        label: 'Node category',
        filter: [],
      },
    ] as unknown as FilterAspects

    expect(
      createFilterFromAspect('net-1', aspects, nodeTable, edgeTable),
    ).toMatchObject({
      name: 'net-1',
      attributeName: 'type',
      target: GraphObjectType.EDGE,
      label: 'Edge type',
    })
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toContain('category')
  })

  it('does not warn for a single entry', () => {
    const warn = vi.spyOn(logApi, 'warn').mockImplementation(() => undefined)
    createFilterFromAspect(
      'net-1',
      [{ appliesTo: 'edges', attributeName: 'type', filter: [] }],
      nodeTable,
      edgeTable,
    )
    expect(warn).not.toHaveBeenCalled()
  })

  it('does not throw on a non-array aspect', () => {
    vi.spyOn(logApi, 'warn').mockImplementation(() => undefined)
    expect(
      createFilterFromAspect('net-1', {}, nodeTable, edgeTable),
    ).toBeUndefined()
  })

  it('reads a "nodes" filter from the node table', () => {
    const config = createFilterFromAspect(
      'net-1',
      [
        {
          widgetType: 'checkboxes',
          appliesTo: 'nodes',
          filterMode: 'nodes',
          attributeName: 'category',
          label: 'Node category',
          filter: [],
        },
      ],
      nodeTable,
      edgeTable,
    )

    expect(config).toMatchObject({
      target: GraphObjectType.NODE,
      range: { values: ['drug', 'gene'] },
    })
  })

  it('skips invalid entries and uses the first valid one', () => {
    vi.spyOn(logApi, 'warn').mockImplementation(() => undefined)
    const config = createFilterFromAspect(
      'net-1',
      [
        { invalid: 'structure' },
        { appliesTo: 'edges', attributeName: 'type', filter: [] },
      ],
      nodeTable,
      edgeTable,
    )

    expect(config).toMatchObject({
      attributeName: 'type',
      target: GraphObjectType.EDGE,
    })
  })

  it('returns undefined for no entries', () => {
    expect(
      createFilterFromAspect(
        'net-1',
        [] as unknown as FilterAspects,
        nodeTable,
        edgeTable,
      ),
    ).toBeUndefined()
  })
})

describe('findFilterAspect', () => {
  it('returns the raw value of the filterWidgets aspect', () => {
    const widgets = [{ attributeName: 'type' }]
    expect(
      findFilterAspect([{ other: [] }, { filterWidgets: widgets }])?.value,
    ).toBe(widgets)
  })

  it.each([
    ['null', null],
    ['false', false],
    ['0', 0],
    ['an empty string', ''],
  ])('finds a present but %s aspect', (_label, value) => {
    const found = findFilterAspect([{ other: [] }, { filterWidgets: value }])
    expect(found).toEqual({ value })
  })

  it('returns undefined when no aspect has the tag', () => {
    expect(findFilterAspect([{ other: [] }])).toBeUndefined()
    expect(findFilterAspect([])).toBeUndefined()
  })

  it('ignores an inherited filterWidgets key', () => {
    const inherited = Object.create({ filterWidgets: [] }) as object
    expect(findFilterAspect([inherited])).toBeUndefined()
  })
})
