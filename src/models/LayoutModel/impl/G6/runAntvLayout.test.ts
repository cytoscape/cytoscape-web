// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { Edge, Node } from '@/models/NetworkModel'
import { G6Algorithms } from './Algorithms/g6Algorithms'
import { runAntvLayout } from './runAntvLayout'

const nodes: Node[] = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id }))
const edges: Edge[] = [
  { id: 'e1', s: 'a', t: 'b' },
  { id: 'e2', s: 'a', t: 'c' },
  { id: 'e3', s: 'b', t: 'd' },
  { id: 'e4', s: 'c', t: 'e' },
]

describe('runAntvLayout', () => {
  it.each(Object.keys(G6Algorithms))(
    'produces finite, non-degenerate positions for %s',
    (name) => {
      let result: Map<string, [number, number]> | undefined
      runAntvLayout(
        nodes,
        edges,
        (positions) => {
          result = positions
        },
        G6Algorithms[name],
      )

      expect(result).toBeDefined()
      expect(result?.size).toBe(nodes.length)
      const points = [...(result ?? new Map()).values()]
      for (const [x, y] of points) {
        expect(Number.isFinite(x)).toBe(true)
        expect(Number.isFinite(y)).toBe(true)
      }
      // The layout must actually spread nodes, not stack them on one point.
      const distinct = new Set(points.map(([x, y]) => `${x},${y}`))
      expect(distinct.size).toBeGreaterThan(1)
    },
  )

  it('reports an empty position map for an empty network', () => {
    let result: Map<string, [number, number]> | undefined
    runAntvLayout(
      [],
      [],
      (positions) => {
        result = positions
      },
      G6Algorithms.gForce,
    )
    expect(result?.size).toBe(0)
  })

  it('throws on an unknown algorithm type', () => {
    expect(() =>
      runAntvLayout(nodes, edges, () => undefined, {
        ...G6Algorithms.gForce,
        parameters: { type: 'not-a-layout' },
      }),
    ).toThrow(/Unknown/)
  })
})
