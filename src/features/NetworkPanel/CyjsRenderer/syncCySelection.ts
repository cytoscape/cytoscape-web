import type { Collection, Core } from 'cytoscape'

import { IdType } from '../../../models/IdType'

const sameIds = (ids: IdType[], current: Set<IdType>): boolean =>
  ids.length === current.size && ids.every((id) => current.has(id))

/**
 * Make Cytoscape.js's selection match the view model's: exactly the given
 * nodes and edges are selected. Does nothing when they already are, so a
 * selection made in the canvas (already in Cytoscape.js) is not redone.
 *
 * Selection never touches visibility. Hidden elements stay hidden when they
 * are selected (Select All selects them, as in Cytoscape Desktop): visibility
 * comes from the visual style's `display`, and `ele.show()` would write an
 * element-level `display: element` that overrides it until removed. The
 * renderer used to call it here, left over from when the Hierarchy Viewer
 * filter hid elements through the selection (#834).
 */
export const syncCySelection = (
  cy: Core,
  selectedNodes: IdType[],
  selectedEdges: IdType[],
): void => {
  const idsOf = (eles: Collection<any, any>): Set<IdType> =>
    new Set(eles.map((ele) => ele.id()))
  if (
    sameIds(selectedNodes, idsOf(cy.nodes(':selected'))) &&
    sameIds(selectedEdges, idsOf(cy.edges(':selected')))
  ) {
    return
  }

  const select = (eles: Collection<any, any>, ids: IdType[]): void => {
    eles.unselect()
    if (ids.length === 0) return
    const wanted = new Set(ids)
    eles.filter((ele) => wanted.has(ele.id())).select()
  }
  select(cy.nodes(), selectedNodes)
  select(cy.edges(), selectedEdges)
}
