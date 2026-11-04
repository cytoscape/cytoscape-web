// @vitest-environment node
import cytoscape from 'cytoscape'
import type { Core, NodeSingular } from 'cytoscape'
import { describe, expect, it } from 'vitest'

import type { Table } from '../../../../models/TableModel'
import { SubsystemTag } from '../../model/HcxMetaTag'
import { D3TreeNode } from './D3TreeNode'
import { cyNetDag2tree2, findRoot, getMembers } from './DataBuilderUtil'

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

describe('cyNetDag2tree2', () => {
  // Cell (members DR1, TAF11, ACTB) contains Nucleus (members DR1, TAF11)
  const cyNet = cytoscape({
    headless: true,
    elements: [
      { data: { id: 'cell' } },
      { data: { id: 'nucleus' } },
      { data: { id: 'e', source: 'cell', target: 'nucleus' } },
    ],
  })
  const table = tableWith({
    cell: {
      name: 'Cell',
      [SubsystemTag.memberNames]: ['DR1', 'TAF11', 'ACTB'],
    },
    nucleus: { name: 'Nucleus', [SubsystemTag.memberNames]: ['DR1', 'TAF11'] },
  })

  const build = (): D3TreeNode[] => {
    const elements: D3TreeNode[] = []
    cyNetDag2tree2(
      cyNet.getElementById('cell') as NodeSingular,
      null,
      table,
      {},
      elements,
      new Set(),
      new Map(),
    )
    return elements
  }

  // #930: the Cell View tells protein rings from subsystems by this flag
  it('marks the rings generated for members, and only those, as members', () => {
    const elements = build()
    const memberRings = elements
      .filter((e) => e.isMember === true)
      .map((e) => `${e.id} (${e.name}, ${e.originalId})`)
      .sort()

    expect(memberRings).toEqual([
      'cell-ACTB (ACTB, ACTB)',
      'nucleus-DR1 (DR1, DR1)',
      'nucleus-TAF11 (TAF11, TAF11)',
    ])
    expect(
      elements.filter((e) => e.isMember !== true).map((e) => e.id),
    ).toEqual(['cell', 'nucleus'])
  })
})

describe('cyNetDag2tree2 with numeric HCX::members', () => {
  // Leaf subsystem whose members are interaction-network node ids
  const cyNet = cytoscape({
    headless: true,
    elements: [{ data: { id: 'complex' } }],
  })
  const table = tableWith({
    complex: { name: 'Complex', [SubsystemTag.members]: [0, 189] },
  })

  const ringNames = (names: Map<string, string>): string[] => {
    const elements: D3TreeNode[] = []
    cyNetDag2tree2(
      cyNet.getElementById('complex') as NodeSingular,
      null,
      table,
      {},
      elements,
      new Set(),
      names,
    )
    return elements.filter((e) => e.isMember === true).map((e) => e.name)
  }

  // #933: the lookup returns names keyed by id; the rings show them
  it('labels each ring with the name looked up for its id', () => {
    expect(
      ringNames(
        new Map([
          ['0', 'ACTB'],
          ['189', 'SMARCD2'],
        ]),
      ),
    ).toEqual(['ACTB', 'SMARCD2'])
  })

  it('falls back to the id when no name was found', () => {
    expect(ringNames(new Map([['189', 'SMARCD2']]))).toEqual(['0', 'SMARCD2'])
  })
})
