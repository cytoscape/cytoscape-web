import { Core } from 'cytoscape'

import { IdType } from '@/models/IdType'

const DIM_CLASS = 'embed-search-dim'
const DIMMED_OPACITY = 0.15

/**
 * Add the dimming rule to the end of the stylesheet, so it wins over the
 * visual style's opacity. Call after every `cy.style(...)` replacement.
 */
export const addSearchStyle = (cy: Core): void => {
  cy.style()
    .selector(`.${DIM_CLASS}`)
    .style({ opacity: DIMMED_OPACITY })
    .update()
}

/**
 * Dim every element except the matched nodes and the edges between them,
 * then fit the view to the matches. An empty list clears the dimming.
 * Dimming goes through a class and the stylesheet, not `ele.hide()`.
 */
export const highlightNodes = (
  cy: Core,
  nodeIds: IdType[],
  padding: number,
): void => {
  cy.startBatch()
  cy.elements().removeClass(DIM_CLASS)
  if (nodeIds.length > 0) {
    const ids = new Set(nodeIds)
    const matched = cy.nodes().filter((n) => ids.has(n.id()))
    const kept = matched.union(matched.edgesWith(matched))
    cy.elements().difference(kept).addClass(DIM_CLASS)
    cy.endBatch()
    cy.fit(matched, padding)
    return
  }
  cy.endBatch()
}
