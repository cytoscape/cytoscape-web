// @vitest-environment node
import type { HierarchyNode } from 'd3-hierarchy'
import { describe, expect, it } from 'vitest'

import type { NetworkSummary } from '../../../models/NetworkSummaryModel'
import type { Table } from '../../../models/TableModel'
import type { D3TreeNode } from '../components/CirclePackingLayout/D3TreeNode'
import type { CirclePackingView } from '../model/CirclePackingView'
import {
  applyCpLayout,
  getHcxMetadata,
  getHcxProps,
  isHCX,
  isSubnetwork,
} from './hierarchyUtil'

describe('isSubnetwork', () => {
  describe('returns true for subnetwork IDs', () => {
    it('should return true for IDs with underscore separator', () => {
      expect(isSubnetwork('hierarchyId_subsystemId')).toBe(true)
      expect(isSubnetwork('abc_123')).toBe(true)
      expect(isSubnetwork('network1_node1')).toBe(true)
      expect(isSubnetwork('parent_child')).toBe(true)
    })

    it('should return true for IDs with multiple underscores', () => {
      expect(isSubnetwork('hierarchy_subsystem_node')).toBe(true)
      expect(isSubnetwork('a_b_c')).toBe(true)
      expect(isSubnetwork('parent_child_grandchild')).toBe(true)
    })

    it('should return true for IDs starting or ending with underscore', () => {
      expect(isSubnetwork('_subsystemId')).toBe(true)
      expect(isSubnetwork('hierarchyId_')).toBe(true)
      expect(isSubnetwork('_')).toBe(true)
    })
  })

  describe('returns false for non-subnetwork IDs', () => {
    it('should return false for IDs without underscore', () => {
      expect(isSubnetwork('hierarchyId')).toBe(false)
      expect(isSubnetwork('abc')).toBe(false)
      expect(isSubnetwork('network123')).toBe(false)
      expect(isSubnetwork('simpleNetwork')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isSubnetwork('')).toBe(false)
    })

    it('should return false for single character IDs', () => {
      expect(isSubnetwork('a')).toBe(false)
      expect(isSubnetwork('1')).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle UUIDs without underscores', () => {
      expect(isSubnetwork('550e8400-e29b-41d4-a716-446655440000')).toBe(false)
    })

    it('should handle UUIDs with underscores (subnetworks)', () => {
      expect(
        isSubnetwork('550e8400-e29b-41d4-a716-446655440000_subsystem'),
      ).toBe(true)
    })

    it('should handle numeric IDs', () => {
      expect(isSubnetwork('123_456')).toBe(true)
      expect(isSubnetwork('123456')).toBe(false)
    })

    it('should handle special characters', () => {
      expect(isSubnetwork('network-id_sub-id')).toBe(true)
      expect(isSubnetwork('network.id_sub.id')).toBe(true)
      expect(isSubnetwork('network@id_sub@id')).toBe(true)
    })
  })
})

const summaryWith = (props: Record<string, string>): NetworkSummary =>
  ({
    properties: Object.entries(props).map(([predicateString, value]) => ({
      predicateString,
      value,
      predicateType: 'string',
    })),
  }) as unknown as NetworkSummary

describe('getHcxProps', () => {
  it('extracts HCX metadata when interactionNetworkUUID is present', () => {
    expect(
      getHcxProps({
        'HCX::interactionNetworkUUID': 'uuid-1',
        'HCX::interactionNetworkHost': 'dev.ndexbio.org',
        'HCX::modelFileCount': '2',
      }),
    ).toEqual({
      interactionNetworkUUID: 'uuid-1',
      interactionNetworkHost: 'dev.ndexbio.org',
      modelFileCount: '2',
    })
  })

  it('returns undefined without the UUID key or for empty objects', () => {
    expect(getHcxProps({ 'HCX::interactionNetworkHost': 'x' })).toBeUndefined()
    expect(getHcxProps({})).toBeUndefined()
  })
})

describe('isHCX / getHcxMetadata', () => {
  const hcxSummary = summaryWith({
    'HCX::interactionNetworkUUID': 'uuid-1',
  })
  const plainSummary = summaryWith({ someProp: 'x' })

  it('detects a hierarchy from its summary properties', () => {
    expect(isHCX(hcxSummary)).toBe(true)
    expect(getHcxMetadata(hcxSummary)?.interactionNetworkUUID).toBe('uuid-1')
  })

  it('rejects non-HCX summaries', () => {
    expect(isHCX(plainSummary)).toBe(false)
    expect(getHcxMetadata(plainSummary)).toBeUndefined()
  })

  it('tolerates undefined summaries and empty property lists', () => {
    expect(isHCX(undefined as unknown as NetworkSummary)).toBe(false)
    expect(isHCX(summaryWith({}))).toBe(false)
    expect(getHcxMetadata(undefined as unknown as NetworkSummary)).toBeUndefined()
  })
})

describe('applyCpLayout', () => {
  // Circle-packing IDs are `<parentId>-<node name>`; a leaf is any ID
  // containing '-'.
  const treeNode = (
    id: string,
    children?: HierarchyNode<D3TreeNode>[],
  ): HierarchyNode<D3TreeNode> =>
    ({ data: { id }, children }) as unknown as HierarchyNode<D3TreeNode>

  const hierarchy = treeNode('root', [
    treeNode('root-geneA'),
    treeNode('sub1', [treeNode('sub1-geneB'), treeNode('sub1-2d-geneC')]),
  ])

  const cpView = {
    hierarchy,
    nodeViews: {
      'root-geneA': { x: 1, y: 2 },
      'sub1-geneB': { x: 3, y: 4 },
      'sub1-2d-geneC': { x: 5, y: 6 },
    },
  } as unknown as CirclePackingView

  const interactionTable = {
    rows: new Map([
      ['n1', { name: 'geneA' }],
      ['n2', { name: 'geneB' }],
      ['n3', { name: 'geneC' }],
      ['n4', { name: 'notInCircle' }],
    ]),
  } as unknown as Table

  const nodeViews = {
    n1: {},
    n2: {},
    n3: {},
    n4: {},
  } as any

  it('maps interaction nodes to scaled circle-packing positions by name', () => {
    const positions = applyCpLayout(
      cpView,
      'root',
      'interaction-net',
      interactionTable,
      nodeViews,
    )

    // SCALING_FACTOR = 40
    expect(positions.get('n1')).toEqual([40, 80])
    expect(positions.get('n2')).toEqual([120, 160])
    // Nodes with no matching circle-packing leaf get no position
    expect(positions.has('n4')).toBe(false)
  })

  it('matches duplicate-subsystem leaves through the -Nd suffix', () => {
    const positions = applyCpLayout(
      cpView,
      'root',
      'interaction-net',
      interactionTable,
      nodeViews,
    )

    expect(positions.get('n3')).toEqual([200, 240])
  })

  it('scopes matching to the descendants of the given subsystem', () => {
    const positions = applyCpLayout(
      cpView,
      'sub1',
      'interaction-net',
      interactionTable,
      nodeViews,
    )

    // geneA lives outside sub1, so it must not be positioned
    expect(positions.has('n1')).toBe(false)
    expect(positions.get('n2')).toEqual([120, 160])
  })

  it('returns an empty map when the view or its hierarchy is missing', () => {
    expect(
      applyCpLayout(
        undefined as unknown as CirclePackingView,
        'root',
        'x',
        interactionTable,
        nodeViews,
      ).size,
    ).toBe(0)
    expect(
      applyCpLayout(
        {} as unknown as CirclePackingView,
        'root',
        'x',
        interactionTable,
        nodeViews,
      ).size,
    ).toBe(0)
  })
})

