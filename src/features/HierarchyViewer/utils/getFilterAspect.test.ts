// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { GraphObjectType } from '../../../models/NetworkModel'
import type { Table } from '../../../models/TableModel'
import type { FilterAspects } from '../model/FilterAspects'
import { createFilterFromAspect } from './getFilterAspect'

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

  it('returns an empty list for no aspects', () => {
    expect(
      createFilterFromAspect('net-1', [] as unknown as FilterAspects, nodeTable, edgeTable),
    ).toEqual([])
  })
})
