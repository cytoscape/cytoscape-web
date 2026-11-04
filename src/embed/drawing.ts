import { ElementDefinition } from 'cytoscape'

import { CyNetwork } from '@/models/CyNetworkModel'
import { IdType } from '@/models/IdType'
import VisualStyleFn from '@/models/VisualStyleModel'
import { VisualEditorProperties } from '@/models/VisualStyleModel/VisualStyleOptions'

import { buildEmbedElements } from './embedElements'

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
 * Everything drawNetwork needs, as plain data: it can be built in a Web
 * Worker and posted to the page.
 */
export interface Drawing {
  nodes: ElementDefinition[]
  edges: ElementDefinition[]
  stylesheet: { selector: string; style: Record<string, unknown> }[]
  /** The network background colour, applied by the caller as CSS. */
  background: string
}

/**
 * Apply the network's visual style and build its Cytoscape.js elements and
 * stylesheet. `positions` replace the network's own node positions.
 */
export const buildDrawing = (
  cyNetwork: CyNetwork,
  positions?: ReadonlyMap<IdType, [number, number]>,
): Drawing => {
  const { network, nodeTable, edgeTable, visualStyle, networkViews } = cyNetwork
  const view = VisualStyleFn.applyVisualStyle({
    network,
    networkView: networkViews[0],
    nodeTable,
    edgeTable,
    visualStyle,
  })
  const { nodes, edges, stylesheet } = buildEmbedElements(
    cyNetwork,
    view,
    cyNetwork.visualStyleOptions?.visualEditorProperties ??
      DEFAULT_EDITOR_PROPERTIES,
    positions,
  )
  return {
    nodes,
    edges,
    stylesheet,
    background:
      (visualStyle.networkBackgroundColor?.defaultValue as
        | string
        | undefined) ?? DEFAULT_BACKGROUND,
  }
}
