import type { Core, NodeSingular } from 'cytoscape'
import { describe, expect, it } from 'vitest'

import type { Table } from '../../../../models/TableModel'
import { SubsystemTag } from '../../model/HcxMetaTag'
import { findRoot, getMembers } from './DataBuilderUtil'

const tableWith = (rows: Record<string, Record<string, unknown>>): Table =>
  ({ rows: new Map(Object.entries(rows)) }) as unknown as Table

/**
 * Minimal stand-in for a cytoscape instance whose nodes().roots() returns the
 * given fake root nodes.
 */
const cyNetWithRoots = (roots: NodeSingular[]): Core =>
  ({
    nodes: () => ({
      roots: () => ({ ...roots, size: () => roots.length }),
    }),
  }) as unknown as Core

const fakeNode = (id: string): NodeSingular =>
  ({ id: () => id }) as unknown as NodeSingular

describe('getMembers', () => {
  it('returns the members column when present', () => {
    const table = tableWith({
      n1: {
        [SubsystemTag.members]: ['a', 'b'],
        [SubsystemTag.memberNames]: ['Gene A', 'Gene B'],
      },
    })

    expect(getMembers('n1', table)).toEqual(['a', 'b'])
  })

  it('falls back to memberNames when members is absent', () => {
    const table = tableWith({
      n1: { [SubsystemTag.memberNames]: ['Gene A'] },
    })

    expect(getMembers('n1', table)).toEqual(['Gene A'])
  })

  it('throws for a missing row', () => {
    expect(() => getMembers('ghost', tableWith({}))).toThrow(
      'Row ghost not found',
    )
  })

  it('throws when the row has neither members nor memberNames', () => {
    const table = tableWith({ n1: { name: 'Node 1' } })

    expect(() => getMembers('n1', table)).toThrow('Member list not found')
  })
})

describe('findRoot', () => {
  it('returns the single root of a tree / DAG', () => {
    const root = fakeNode('root')

    expect(findRoot(cyNetWithRoots([root]))).toBe(root)
  })

  // Issue #630: a hierarchy carrying non parent-child edges can end up with
  // zero or several roots. Throwing here rejected the createTreeLayout promise
  // and left a blank Cell View tab, so findRoot must degrade instead.
  it('returns undefined instead of throwing when there is no root', () => {
    const cyNet = cyNetWithRoots([])

    expect(() => findRoot(cyNet)).not.toThrow()
    expect(findRoot(cyNet)).toBeUndefined()
  })

  it('returns undefined instead of throwing for a forest with several roots', () => {
    const cyNet = cyNetWithRoots([fakeNode('r1'), fakeNode('r2')])

    expect(() => findRoot(cyNet)).not.toThrow()
    expect(findRoot(cyNet)).toBeUndefined()
  })
})
