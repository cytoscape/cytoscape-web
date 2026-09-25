// @vitest-environment node
import { describe, expect, it } from 'vitest'

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
  it('builds a config per aspect, pulling values from the matching table', () => {
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

    const configs = createFilterFromAspect(
      'net-1',
      aspects,
      nodeTable,
      edgeTable,
    )

    expect(configs).toHaveLength(2)
    expect(configs[0]).toMatchObject({
      name: 'net-1',
      attributeName: 'type',
      target: GraphObjectType.EDGE,
      label: 'Edge type',
      range: { values: ['activates', 'binds'] },
    })
    expect(configs[1]).toMatchObject({
      attributeName: 'category',
      target: GraphObjectType.NODE,
      range: { values: ['drug', 'gene'] },
    })
  })

  it('does not throw on a non-array aspect', () => {
    expect(createFilterFromAspect('net-1', {}, nodeTable, edgeTable)).toEqual(
      [],
    )
  })

  it('reads a "nodes" filter from the node table', () => {
    const configs = createFilterFromAspect(
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

    expect(configs).toHaveLength(1)
    expect(configs[0]).toMatchObject({
      target: GraphObjectType.NODE,
      range: { values: ['drug', 'gene'] },
    })
  })

  it('skips invalid entries and keeps the valid ones', () => {
    const configs = createFilterFromAspect(
      'net-1',
      [
        { invalid: 'structure' },
        { appliesTo: 'edges', attributeName: 'type', filter: [] },
      ],
      nodeTable,
      edgeTable,
    )

    expect(configs).toHaveLength(1)
    expect(configs[0]).toMatchObject({
      attributeName: 'type',
      target: GraphObjectType.EDGE,
    })
  })

  it('returns an empty list for no aspects', () => {
    expect(
      createFilterFromAspect(
        'net-1',
        [] as unknown as FilterAspects,
        nodeTable,
        edgeTable,
      ),
    ).toEqual([])
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
