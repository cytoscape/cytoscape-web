import { Core } from 'cytoscape'

import { addCyElements } from '@/features/NetworkPanel/CyjsRenderer/cyjsFactoryUtil'
import {
  applyViewModel,
  createCyjsDataMapper,
} from '@/features/NetworkPanel/CyjsRenderer/cyjsRenderUtil'
import { CyNetwork } from '@/models/CyNetworkModel'
import { IdType } from '@/models/IdType'
import VisualStyleFn from '@/models/VisualStyleModel'
import { VisualEditorProperties } from '@/models/VisualStyleModel/VisualStyleOptions'

const DEFAULT_BACKGROUND = '#ffffff'

/** Used when the CX2 carries no visual editor properties. */
const DEFAULT_EDITOR_PROPERTIES: VisualEditorProperties = {
  nodeSizeLocked: false,
  arrowColorMatchesEdge: false,
  tableDisplayConfiguration: {
    nodeTable: { columnConfiguration: [] },
    edgeTable: { columnConfiguration: [] },
  },
}

/**
 * Draw a network into `cy` through the full app's pipeline
 * (CyjsRenderer.tsx renderNetwork):
 * applyVisualStyle -> addCyElements -> applyViewModel -> createCyjsDataMapper.
 *
 * Returns the network background colour. The full app applies it as
 * container CSS (NetworkPanel.tsx), not through the stylesheet.
 */
export const drawNetwork = (cy: Core, cyNetwork: CyNetwork): string => {
  const { network, nodeTable, edgeTable, visualStyle, networkViews } = cyNetwork
  const view = VisualStyleFn.applyVisualStyle({
    network,
    networkView: networkViews[0],
    nodeTable,
    edgeTable,
    visualStyle,
  })

  cy.startBatch()
  cy.elements().remove()
  addCyElements(
    cy,
    Object.values(view.nodeViews),
    network.edges,
    view.edgeViews,
  )
  applyViewModel(
    cy,
    view,
    cyNetwork.visualStyleOptions?.visualEditorProperties ??
      DEFAULT_EDITOR_PROPERTIES,
  )
  cy.style(createCyjsDataMapper(visualStyle) as any)
  cy.endBatch()

  return (
    (visualStyle.networkBackgroundColor?.defaultValue as string | undefined) ??
    DEFAULT_BACKGROUND
  )
}

/** Move nodes to the positions a layout engine returned. */
export const applyPositions = (
  cy: Core,
  positions: Map<IdType, [number, number]>,
): void => {
  cy.startBatch()
  positions.forEach(([x, y], nodeId) => {
    cy.getElementById(nodeId).position({ x, y })
  })
  cy.endBatch()
}
