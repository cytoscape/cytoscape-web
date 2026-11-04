// @vitest-environment node
import * as d3Hierarchy from 'd3-hierarchy'
import { describe, expect, it } from 'vitest'

import { D3TreeNode } from '@/features/HierarchyViewer/components/CirclePackingLayout/D3TreeNode'

import { positionsByMemberId } from './cpPositions'

const node = (
  id: string,
  parentId: string,
  originalId?: string,
): D3TreeNode => ({
  id,
  parentId,
  originalId,
  name: id,
  size: 1,
  members: [],
})

// Root 1 with subsystem 72; 72's leaves are members 257 and 275
const root = d3Hierarchy.stratify<D3TreeNode>()([
  node('1', ''),
  node('72', '1'),
  node('72-257', '72', '257'),
  node('72-275', '72', '275'),
  node('1-300', '1', '300'),
])
root.sum(() => 1)
d3Hierarchy.pack<D3TreeNode>().size([100, 100])(root)
const packed = root as d3Hierarchy.HierarchyCircularNode<D3TreeNode>

describe('positionsByMemberId', () => {
  it('places nodes at their leaf circles, scaled as applyCpLayout scales', () => {
    const positions = positionsByMemberId(
      packed,
      '72',
      new Set(['257', '275', '300']),
      new Map(),
    )
    const leaf = packed.leaves().find((l) => l.data.id === '72-257')!
    expect([...positions.keys()].sort()).toEqual(['257', '275'])
    expect(positions.get('257')).toEqual([leaf.x * 40, leaf.y * 40])
  })

  it('leaves out nodes already placed', () => {
    const positions = positionsByMemberId(
      packed,
      '72',
      new Set(['257', '275']),
      new Map([['275', [0, 0]]]),
    )
    expect([...positions.keys()]).toEqual(['257'])
  })

  it('accepts numeric member ids', () => {
    const numeric = d3Hierarchy.stratify<D3TreeNode>()([
      node('1', ''),
      { ...node('1-7', '1'), originalId: 7 as unknown as string },
    ])
    numeric.sum(() => 1)
    d3Hierarchy.pack<D3TreeNode>().size([10, 10])(numeric)
    const positions = positionsByMemberId(
      numeric as d3Hierarchy.HierarchyCircularNode<D3TreeNode>,
      '1',
      new Set(['7']),
      new Map(),
    )
    expect([...positions.keys()]).toEqual(['7'])
  })

  it('leaves out members that are not nodes of the network', () => {
    const positions = positionsByMemberId(
      packed,
      '72',
      new Set(['257']),
      new Map(),
    )
    expect([...positions.keys()]).toEqual(['257'])
  })
})
