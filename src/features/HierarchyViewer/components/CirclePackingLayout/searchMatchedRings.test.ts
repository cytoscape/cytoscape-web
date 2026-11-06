// @vitest-environment node
import { stratify } from 'd3-hierarchy'
import { describe, expect, it } from 'vitest'

import { SearchRun } from '../../../../models/FilterModel/Search'
import { D3TreeNode } from './D3TreeNode'
import { findSearchMatchedRings } from './searchMatchedRings'

const HIERARCHY_ID = 'hierarchy-1'

// Built the way cyNetDag2tree2 builds it: subsystems keep their node id
// (a second visit of a DAG node gets a `-2d` suffix and keeps the original id
// in `originalId`), and a protein ring is `<subsystemId>-<member>`.
//
// Cell (0)
// ├── Nucleus (1)
// │   ├── Nucleoplasm (3): DR1, TAF11, NDR1
// │   └── Shared (4): DR1
// ├── Cytoplasm (2): ACTB, DR1-like
// │   └── Shared (4-2d): DR1      <- the same subsystem reached again
// └── MYC (a protein ring directly under the root)
const ring = (parentId: string, member: string): D3TreeNode => ({
  id: `${parentId}-${member}`,
  originalId: member,
  parentId,
  name: member,
  size: 1,
  members: [],
  isMember: true,
})

const tree: D3TreeNode[] = [
  { id: '0', parentId: '', name: 'Cell', size: 0, members: [] },
  ring('0', 'MYC'),
  { id: '1', parentId: '0', name: 'Nucleus', size: 0, members: [] },
  { id: '3', parentId: '1', name: 'Nucleoplasm', size: 0, members: [] },
  ring('3', 'DR1'),
  ring('3', 'TAF11'),
  ring('3', 'NDR1'),
  { id: '4', parentId: '1', name: 'Shared', size: 0, members: [] },
  ring('4', 'DR1'),
  { id: '2', parentId: '0', name: 'Cytoplasm', size: 0, members: [] },
  ring('2', 'ACTB'),
  ring('2', 'DR1-like'),
  {
    id: '4-2d',
    originalId: '4',
    parentId: '2',
    name: 'Shared',
    size: 0,
    members: [],
  },
  ring('4-2d', 'DR1'),
]

const root = stratify<D3TreeNode>()(tree)

const run = (overrides: Partial<SearchRun> = {}): SearchRun => ({
  id: 1,
  networkId: HIERARCHY_ID,
  query: 'DR1',
  options: { exact: false, operator: 'OR' },
  nodeIds: ['0', '1', '3'],
  ...overrides,
})

const matched = (
  searchRun: SearchRun | undefined,
  selected: readonly string[] = searchRun?.nodeIds ?? [],
): string[] =>
  [...findSearchMatchedRings(root, searchRun, HIERARCHY_ID, selected)].sort()

describe('findSearchMatchedRings', () => {
  it('matches the protein rings of the subsystems the search selected', () => {
    // Contains: "DR1" is also part of "NDR1". The DR1 ring under Shared (4) is
    // left out because the search did not select Shared.
    expect(matched(run())).toEqual(['3-DR1', '3-NDR1'])
  })

  it('uses the exact mode of the search', () => {
    expect(matched(run({ options: { exact: true, operator: 'OR' } }))).toEqual([
      '3-DR1',
    ])
  })

  it('matches any token of the query, whatever the operator', () => {
    // AND decided which subsystems were selected; a ring is one protein, so
    // it matches when it matches one of the tokens.
    expect(
      matched(
        run({ query: 'DR1 TAF11', options: { exact: true, operator: 'AND' } }),
      ),
    ).toEqual(['3-DR1', '3-TAF11'])
  })

  it('matches the rings of every copy of a subsystem reached twice', () => {
    expect(
      matched(
        run({ nodeIds: ['4'], options: { exact: true, operator: 'OR' } }),
      ),
    ).toEqual(['4-2d-DR1', '4-DR1'])
  })

  it('matches a protein ring directly under the root', () => {
    expect(matched(run({ query: 'MYC', nodeIds: ['0'] }))).toEqual(['0-MYC'])
  })

  it('matches nothing once the selection is no longer the search result', () => {
    // e.g. the user clicked a ring or used Select > Deselect All
    expect(matched(run(), ['3'])).toEqual([])
    expect(matched(run(), [])).toEqual([])
  })

  it('accepts the search result selected in another order', () => {
    expect(matched(run(), ['3', '0', '1'])).toEqual(['3-DR1', '3-NDR1'])
  })

  it('ignores a search of another network or of a subnetwork', () => {
    expect(matched(run({ networkId: 'other' }))).toEqual([])
    expect(matched(run({ networkId: `${HIERARCHY_ID}_3` }))).toEqual([])
  })

  it('matches nothing without a search, a query or selected subsystems', () => {
    expect(matched(undefined)).toEqual([])
    expect(matched(run({ query: '   ' }))).toEqual([])
    expect(matched(run({ nodeIds: [] }))).toEqual([])
  })

  it('matches nothing when the hierarchy could not be built', () => {
    // createTreeLayout returns `{}` for a hierarchy without a single root
    const broken = {} as typeof root
    expect([
      ...findSearchMatchedRings(broken, run(), HIERARCHY_ID, run().nodeIds),
    ]).toEqual([])
    expect([
      ...findSearchMatchedRings(undefined, run(), HIERARCHY_ID, run().nodeIds),
    ]).toEqual([])
  })

  it('does not treat a subsystem without children as a protein ring', () => {
    const lone = stratify<D3TreeNode>()([
      { id: 'r', parentId: '', name: 'Root', size: 0, members: [] },
      { id: 's', parentId: 'r', name: 'DR1 complex', size: 0, members: [] },
    ])
    // A subsystem without members or children is a leaf of the tree too, but
    // it is not a protein ring.
    expect([
      ...findSearchMatchedRings(lone, run({ nodeIds: ['r'] }), HIERARCHY_ID, [
        'r',
      ]),
    ]).toEqual([])
  })
})
