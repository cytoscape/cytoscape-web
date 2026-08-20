// @vitest-environment node
import { describe, expect, it } from 'vitest'

import type { Table } from '../../../../models/TableModel'
import {
  EDGE_INTERACTION_ATTR,
  hasUniformEdgeInteraction,
} from './circlePackingSupport'

const edgeTableWith = (rows: Record<string, Record<string, unknown>>): Table =>
  ({
    columns: [{ name: EDGE_INTERACTION_ATTR, type: 'string' }],
    rows: new Map(Object.entries(rows)),
  }) as unknown as Table

describe('hasUniformEdgeInteraction', () => {
  it('accepts a hierarchy where every edge has the same interaction', () => {
    const edgeTable = edgeTableWith({
      e1: { [EDGE_INTERACTION_ATTR]: 'interacts' },
      e2: { [EDGE_INTERACTION_ATTR]: 'interacts' },
      e3: { [EDGE_INTERACTION_ATTR]: 'interacts' },
    })

    expect(hasUniformEdgeInteraction(edgeTable)).toBe(true)
  })

  it('rejects a hierarchy that mixes interaction types', () => {
    const edgeTable = edgeTableWith({
      e1: { [EDGE_INTERACTION_ATTR]: 'interacts' },
      e2: { [EDGE_INTERACTION_ATTR]: 'activates' },
    })

    expect(hasUniformEdgeInteraction(edgeTable)).toBe(false)
  })

  it('accepts a table with no interaction column at all', () => {
    const edgeTable = {
      columns: [{ name: 'weight', type: 'double' }],
      rows: new Map([
        ['e1', { weight: 0.5 }],
        ['e2', { weight: 0.7 }],
      ]),
    } as unknown as Table

    expect(hasUniformEdgeInteraction(edgeTable)).toBe(true)
  })

  it('accepts an edge table with no rows', () => {
    expect(hasUniformEdgeInteraction(edgeTableWith({}))).toBe(true)
  })

  it('ignores null and undefined interaction values', () => {
    const edgeTable = edgeTableWith({
      e1: { [EDGE_INTERACTION_ATTR]: 'interacts' },
      e2: { [EDGE_INTERACTION_ATTR]: null },
      e3: {},
    })

    expect(hasUniformEdgeInteraction(edgeTable)).toBe(true)
  })

  it('still rejects when the only two real values differ among blanks', () => {
    const edgeTable = edgeTableWith({
      e1: { [EDGE_INTERACTION_ATTR]: 'interacts' },
      e2: { [EDGE_INTERACTION_ATTR]: null },
      e3: { [EDGE_INTERACTION_ATTR]: 'binds' },
    })

    expect(hasUniformEdgeInteraction(edgeTable)).toBe(false)
  })

  it('treats a missing edge table as supported, so loading networks are not disabled', () => {
    expect(hasUniformEdgeInteraction(undefined)).toBe(true)
  })
})
