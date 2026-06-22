/**
 * Test: BiologicalFlowLayout engine
 * Verifies the layout algorithm produces correct positions for biological pathways.
 */
import { BiologicalFlowLayout } from './biologicalFlowLayout'
import { IdType } from '../../../../IdType'
import { Node, Edge } from '../../../../NetworkModel'

// Minimal Node/Edge to satisfy the interface
const makeNode = (id: string): Node => ({ id } as Node)
const makeEdge = (s: string, t: string): Edge => ({ s, t } as Edge)

describe('BiologicalFlowLayout', () => {
  it('assigns left-to-right positions for a linear chain', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')]
    const edges = [makeEdge('a', 'b'), makeEdge('b', 'c')]

    let result: Map<IdType, [number, number]> | null = null
    BiologicalFlowLayout.apply(nodes, edges, (pos) => { result = pos }, BiologicalFlowLayout.algorithms['biological-flow'])

    expect(result).not.toBeNull()
    const [ax] = result!.get('a')!
    const [bx] = result!.get('b')!
    const [cx] = result!.get('c')!
    expect(ax).toBeLessThan(bx)
    expect(bx).toBeLessThan(cx)
  })

  it('handles cycles without crashing', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')]
    const edges = [makeEdge('a', 'b'), makeEdge('b', 'c'), makeEdge('c', 'a')]

    let result: Map<IdType, [number, number]> | null = null
    BiologicalFlowLayout.apply(nodes, edges, (pos) => { result = pos }, BiologicalFlowLayout.algorithms['biological-flow'])

    expect(result!.size).toBe(3)
  })

  it('assigns all nodes unique positions', () => {
    const nodes = [makeNode('x'), makeNode('y'), makeNode('z')]
    const edges = [makeEdge('x', 'y'), makeEdge('x', 'z')]

    let result: Map<IdType, [number, number]> | null = null
    BiologicalFlowLayout.apply(nodes, edges, (pos) => { result = pos }, BiologicalFlowLayout.algorithms['biological-flow'])

    const positions = [...result!.values()]
    const posStrings = positions.map(([x, y]) => `${x},${y}`)
    expect(new Set(posStrings).size).toBe(3)
  })

  it('respects margins (x >= 150, y >= 200)', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c'), makeNode('d')]
    const edges = [makeEdge('a', 'b'), makeEdge('b', 'c'), makeEdge('c', 'd')]

    let result: Map<IdType, [number, number]> | null = null
    BiologicalFlowLayout.apply(nodes, edges, (pos) => { result = pos }, BiologicalFlowLayout.algorithms['biological-flow'])

    for (const [x, y] of result!.values()) {
      expect(x).toBeGreaterThanOrEqual(150)
      expect(y).toBeGreaterThanOrEqual(200)
    }
  })
})
