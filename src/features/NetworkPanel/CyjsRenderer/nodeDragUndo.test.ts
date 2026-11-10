// @vitest-environment node
import cytoscape, { Core, NodeCollection } from 'cytoscape'
import { describe, expect, it, vi } from 'vitest'

import { listenForNodeDrags, NodeDrag } from './nodeDragUndo'

const createCy = (): Core =>
  cytoscape({
    headless: true,
    // The default null layout would move every node to the origin.
    layout: { name: 'preset' },
    elements: [
      { data: { id: 'n1' }, position: { x: 0, y: 0 } },
      { data: { id: 'n2' }, position: { x: 100, y: 0 } },
      { data: { id: 'n3' }, position: { x: 200, y: 0 } },
    ],
  })

const nodesById = (cy: Core, ids: string[]): NodeCollection =>
  cy.nodes().filter((node) => ids.includes(node.id()))

// Cytoscape.js emits grab and dragfree on each dragged node in turn, the way a
// collection emit does: one drag of a selection is N events back to back.
const drag = (cy: Core, ids: string[], dx: number, dy: number): void => {
  const nodes = nodesById(cy, ids)
  nodes.emit('grab')
  nodes.forEach((node) => {
    const { x, y } = node.position()
    node.position({ x: x + dx, y: y + dy })
  })
  nodes.emit('dragfree')
}

const flushMicrotasks = (): Promise<void> => Promise.resolve()

describe('listenForNodeDrags (#870)', () => {
  it('reports a multi-node drag once, with every node, after the last dragfree', async () => {
    const cy = createCy()
    const onDrag = vi.fn<(drag: NodeDrag) => void>()
    listenForNodeDrags(cy, onDrag)

    drag(cy, ['n1', 'n2', 'n3'], 10, 20)
    // Not yet: more dragfree events of the same drag may still follow.
    expect(onDrag).not.toHaveBeenCalled()

    await flushMicrotasks()
    expect(onDrag).toHaveBeenCalledTimes(1)
    const { from, to } = onDrag.mock.calls[0][0]
    expect(Object.fromEntries(from)).toEqual({
      n1: [0, 0],
      n2: [100, 0],
      n3: [200, 0],
    })
    expect(Object.fromEntries(to)).toEqual({
      n1: [10, 20],
      n2: [110, 20],
      n3: [210, 20],
    })
  })

  it('reports two drags as two moves', async () => {
    const cy = createCy()
    const onDrag = vi.fn<(drag: NodeDrag) => void>()
    listenForNodeDrags(cy, onDrag)

    drag(cy, ['n1', 'n2'], 10, 0)
    await flushMicrotasks()
    drag(cy, ['n3'], 0, 10)
    await flushMicrotasks()

    expect(onDrag).toHaveBeenCalledTimes(2)
    expect([...onDrag.mock.calls[0][0].to.keys()]).toEqual(['n1', 'n2'])
    expect(Object.fromEntries(onDrag.mock.calls[1][0].from)).toEqual({
      n3: [200, 0],
    })
    expect(Object.fromEntries(onDrag.mock.calls[1][0].to)).toEqual({
      n3: [200, 10],
    })
  })

  it('leaves out nodes that end where they started, and reports nothing if none moved', async () => {
    const cy = createCy()
    const onDrag = vi.fn<(drag: NodeDrag) => void>()
    listenForNodeDrags(cy, onDrag)

    drag(cy, ['n1', 'n2'], 0, 0)
    await flushMicrotasks()
    expect(onDrag).not.toHaveBeenCalled()

    const nodes = nodesById(cy, ['n1', 'n2'])
    nodes.emit('grab')
    cy.getElementById('n2').position({ x: 120, y: 0 })
    nodes.emit('dragfree')
    await flushMicrotasks()

    expect(onDrag).toHaveBeenCalledTimes(1)
    expect(Object.fromEntries(onDrag.mock.calls[0][0].to)).toEqual({
      n2: [120, 0],
    })
  })

  it('takes the start from positionBeforeDrag when the grab was not seen', async () => {
    const cy = createCy()
    const onDrag = vi.fn<(drag: NodeDrag) => void>()
    // A re-render can re-register the listeners mid-drag, after the grab.
    listenForNodeDrags(cy, onDrag, {
      positionBeforeDrag: (nodeId) => (nodeId === 'n1' ? [-5, -5] : undefined),
    })

    cy.getElementById('n1').position({ x: 30, y: 30 })
    cy.getElementById('n2').position({ x: 130, y: 30 })
    nodesById(cy, ['n1', 'n2']).emit('dragfree')
    await flushMicrotasks()

    const { from, to } = onDrag.mock.calls[0][0]
    expect(Object.fromEntries(from)).toEqual({ n1: [-5, -5] })
    // n2's start is unknown: its new position is still kept, but undo cannot
    // move it back.
    expect(Object.fromEntries(to)).toEqual({ n1: [30, 30], n2: [130, 30] })
  })
})
