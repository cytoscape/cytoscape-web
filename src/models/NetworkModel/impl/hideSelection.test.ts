// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { Edge } from '../Edge'
import { getElementsToHide } from './hideSelection'

// n1 -e1-> n2 -e2-> n3, n3 -e3-> n3 (self loop), n4 isolated
const edges: Edge[] = [
  { id: 'e1', s: 'n1', t: 'n2' },
  { id: 'e2', s: 'n2', t: 'n3' },
  { id: 'e3', s: 'n3', t: 'n3' },
]

describe('getElementsToHide', () => {
  it('hides nothing when nothing is selected', () => {
    expect(getElementsToHide(edges, [], [])).toEqual({
      nodeIds: [],
      edgeIds: [],
    })
  })

  it('hides the selected nodes and every edge connected to them', () => {
    expect(getElementsToHide(edges, ['n1'], [])).toEqual({
      nodeIds: ['n1'],
      edgeIds: ['e1'],
    })
    // Incoming and outgoing edges alike
    expect(getElementsToHide(edges, ['n2'], [])).toEqual({
      nodeIds: ['n2'],
      edgeIds: ['e1', 'e2'],
    })
  })

  it('hides a self loop of a selected node once', () => {
    expect(getElementsToHide(edges, ['n3'], [])).toEqual({
      nodeIds: ['n3'],
      edgeIds: ['e2', 'e3'],
    })
  })

  it('hides selected edges without their nodes', () => {
    expect(getElementsToHide(edges, [], ['e2'])).toEqual({
      nodeIds: [],
      edgeIds: ['e2'],
    })
  })

  it('lists each element once when selected edges touch selected nodes', () => {
    expect(getElementsToHide(edges, ['n1', 'n1', 'n4'], ['e1', 'e1'])).toEqual({
      nodeIds: ['n1', 'n4'],
      edgeIds: ['e1'],
    })
  })

  it('handles a network without edges', () => {
    expect(getElementsToHide([], ['n1'], [])).toEqual({
      nodeIds: ['n1'],
      edgeIds: [],
    })
  })
})
