import { HierarchyCircularNode } from 'd3-hierarchy'

import {
  createCirclePackingView,
  createTreeLayout,
} from '@/features/HierarchyViewer/components/CirclePackingLayout/CirclePackingLayout'
import { D3TreeNode } from '@/features/HierarchyViewer/components/CirclePackingLayout/D3TreeNode'
import { CirclePackingView } from '@/features/HierarchyViewer/model/CirclePackingView'
import { CyNetwork } from '@/models/CyNetworkModel'
import { IdType } from '@/models/IdType'
import VisualStyleFn from '@/models/VisualStyleModel'

/**
 * Size the circle packing is computed at. The drawing is fitted to the
 * pane, so this only fixes the coordinate space applyCpLayout scales from.
 */
const PACK_SIZE = 1000

/** The embed shows public networks only, so NDEx requests carry no token. */
const noToken = async (): Promise<string> => ''

/**
 * Build the Cell View model of a hierarchy, as CirclePackingPanel.tsx
 * buildCirclePackingViewModel does: the D3 tree from the hierarchy network,
 * packed into circles, with the visual style's node labels.
 *
 * Member ids that are numbers are resolved to names through the
 * interaction network (`rootNetworkId`) on `ndexUrl`.
 *
 * Throws when the hierarchy has no single root.
 */
export const buildCellView = async (
  hierarchy: CyNetwork,
  rootNetworkId: IdType,
  ndexUrl: string,
): Promise<CirclePackingView> => {
  const root = await createTreeLayout({
    network: hierarchy.network,
    nodeTable: hierarchy.nodeTable,
    rootNetworkHostUrl: ndexUrl,
    getToken: noToken,
    rootNetworkId,
  })
  // createTreeLayout returns {} when the hierarchy has no single root
  if (Object.keys(root).length === 0) {
    throw new Error('The hierarchy does not have a single root.')
  }
  const view = VisualStyleFn.applyVisualStyle({
    network: hierarchy.network,
    networkView: hierarchy.networkViews[0],
    nodeTable: hierarchy.nodeTable,
    edgeTable: hierarchy.edgeTable,
    visualStyle: hierarchy.visualStyle,
  })
  return createCirclePackingView(view, root, PACK_SIZE, PACK_SIZE)
}

export const cellViewRoot = (
  cellView: CirclePackingView,
): HierarchyCircularNode<D3TreeNode> =>
  cellView.hierarchy as HierarchyCircularNode<D3TreeNode>
