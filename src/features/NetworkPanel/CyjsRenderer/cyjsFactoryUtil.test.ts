// @vitest-environment node
import type { Core } from 'cytoscape'
import { describe, expect, it, vi } from 'vitest'

import type { Edge } from '../../../models/NetworkModel'
import type { EdgeView, NodeView } from '../../../models/ViewModel'
import { addCyElements } from './cyjsFactoryUtil'

const nodeView = (
  id: string,
  x: number,
  y: number,
  values: [string, unknown][] = [],
): NodeView => ({ id, x, y, values: new Map(values) }) as unknown as NodeView

const edgeView = (
  id: string,
  values: [string, unknown][] = [],
): EdgeView => ({ id, values: new Map(values) }) as unknown as EdgeView

describe('addCyElements', () => {
  it('converts node and edge views into cytoscape.js element objects', () => {
    const add = vi.fn()
    const cy = { add } as unknown as Core
    const nodeViews = [
      nodeView('n1', 10, 20, [['nodeLabel', 'Node 1']]),
      nodeView('n2', 30, 40),
    ]
    const edges: Edge[] = [{ id: 'e1', s: 'n1', t: 'n2' }]
    const edgeViews = { e1: edgeView('e1', [['edgeWidth', 2]]) }

    addCyElements(cy, nodeViews, edges, edgeViews)

    expect(add).toHaveBeenCalledTimes(2)
    // First call: nodes with positions and flattened view values
    expect(add.mock.calls[0][0]).toEqual([
      {
        group: 'nodes',
        data: { id: 'n1', nodeLabel: 'Node 1' },
        position: { x: 10, y: 20 },
      },
      {
        group: 'nodes',
        data: { id: 'n2' },
        position: { x: 30, y: 40 },
      },
    ])
    // Second call: edges with source/target and flattened view values
    expect(add.mock.calls[1][0]).toEqual([
      {
        group: 'edges',
        data: { id: 'e1', source: 'n1', target: 'n2', edgeWidth: 2 },
      },
    ])
  })

  it('handles empty networks without adding any elements', () => {
    const add = vi.fn()
    const cy = { add } as unknown as Core

    addCyElements(cy, [], [], {})

    expect(add.mock.calls[0][0]).toEqual([])
    expect(add.mock.calls[1][0]).toEqual([])
  })
})
