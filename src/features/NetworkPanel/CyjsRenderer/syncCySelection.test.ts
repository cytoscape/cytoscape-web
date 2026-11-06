// @vitest-environment node
import cytoscape, { Core } from 'cytoscape'
import { describe, expect, it } from 'vitest'

import { syncCySelection } from './syncCySelection'

// n1 -e1-> n2 -e2-> n3. Hidden elements get display: none from the
// stylesheet, the way CW's visibility bypasses reach Cytoscape.js.
const createCy = (hidden: string[] = []): Core =>
  cytoscape({
    headless: true,
    styleEnabled: true,
    elements: [
      { data: { id: 'n1' } },
      { data: { id: 'n2' } },
      { data: { id: 'n3' } },
      { data: { id: 'e1', source: 'n1', target: 'n2' } },
      { data: { id: 'e2', source: 'n2', target: 'n3' } },
    ],
    style: hidden.map((id) => ({
      selector: `#${id}`,
      style: { display: 'none' },
    })),
  })

const selectedIds = (cy: Core) => ({
  nodes: cy
    .nodes(':selected')
    .map((ele) => ele.id())
    .sort(),
  edges: cy
    .edges(':selected')
    .map((ele) => ele.id())
    .sort(),
})

const displayOf = (cy: Core, id: string): string =>
  cy.getElementById(id).style('display')

describe('syncCySelection', () => {
  it('selects exactly the given nodes and edges', () => {
    const cy = createCy()
    syncCySelection(cy, ['n1', 'n3'], ['e2'])
    expect(selectedIds(cy)).toEqual({ nodes: ['n1', 'n3'], edges: ['e2'] })
    syncCySelection(cy, ['n2'], [])
    expect(selectedIds(cy)).toEqual({ nodes: ['n2'], edges: [] })
    syncCySelection(cy, [], [])
    expect(selectedIds(cy)).toEqual({ nodes: [], edges: [] })
  })

  it('unselects edges that left a selection of edges', () => {
    const cy = createCy()
    syncCySelection(cy, ['n1'], ['e1', 'e2'])
    // Hide Selected deselected e1 only
    syncCySelection(cy, ['n1'], ['e2'])
    expect(selectedIds(cy)).toEqual({ nodes: ['n1'], edges: ['e2'] })
  })

  it('leaves hidden elements hidden when selecting all of them', () => {
    const cy = createCy(['n1', 'e1'])
    syncCySelection(cy, ['n1', 'n2', 'n3'], ['e1', 'e2'])
    expect(selectedIds(cy)).toEqual({
      nodes: ['n1', 'n2', 'n3'],
      edges: ['e1', 'e2'],
    })
    expect(displayOf(cy, 'n1')).toBe('none')
    expect(displayOf(cy, 'e1')).toBe('none')
  })

  it('leaves hidden elements hidden when the selection is cleared', () => {
    const cy = createCy(['n1', 'e1'])
    syncCySelection(cy, ['n2'], ['e2'])
    syncCySelection(cy, [], [])
    expect(displayOf(cy, 'n1')).toBe('none')
    expect(displayOf(cy, 'e1')).toBe('none')
  })

  it('shows an element again once the stylesheet stops hiding it', () => {
    const cy = createCy(['n1'])
    syncCySelection(cy, ['n1'], [])
    // Show All: the next stylesheet has no display: none for n1
    cy.style([])
    expect(displayOf(cy, 'n1')).toBe('element')
  })
})
