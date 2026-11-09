import { buildShareUrl } from '@/features/FloatingToolBar/shareUrl'
import { getSubNetworkId } from '@/features/HierarchyViewer/utils/subnetworkQueryUtil'
import { IdType } from '@/models/IdType'
import { EMBED_PARAMS } from './embedParams'

/** What the embed shows when the visitor opens it in the editor. */
export interface LinkOutState {
  /** Selected nodes of a plain network. */
  selectedNodes?: IdType[]
  selectedEdges?: IdType[]
  /** Selected subsystem of a hierarchy. */
  subsystemId?: IdType
  /** Selected nodes in that subsystem's interaction network. */
  subnetworkNodeIds?: IdType[]
  /** Hierarchy tab on screen. */
  networkViewTab?: number
  /** Share-link key the embed was opened with. */
  accessKey?: string
}

/**
 * Builds the "Open in Cytoscape Web" URL: the editor's share link for the
 * network (`/0/networks/<id>`, see `buildShareUrl`), carrying the current
 * selection in the deep-link parameters the editor restores, and the
 * share-link key so an unlisted network opens too.
 */
export const embedLinkOutUrl = (
  origin: string,
  baseName: string | undefined,
  networkId: IdType,
  state: LinkOutState = {},
): string => {
  const params = new URLSearchParams()
  const {
    selectedNodes = [],
    selectedEdges = [],
    subsystemId,
    subnetworkNodeIds = [],
    networkViewTab,
    accessKey,
  } = state

  if (subsystemId !== undefined) {
    params.set(EMBED_PARAMS.selectedNodes, subsystemId)
    params.set('activeNetworkView', getSubNetworkId(networkId, subsystemId))
    if (subnetworkNodeIds.length > 0) {
      params.set(
        EMBED_PARAMS.selectedSubnetworkNodes,
        subnetworkNodeIds.join(' '),
      )
    }
  } else {
    if (selectedNodes.length > 0) {
      params.set(EMBED_PARAMS.selectedNodes, selectedNodes.join(' '))
    }
    if (selectedEdges.length > 0) {
      params.set(EMBED_PARAMS.selectedEdges, selectedEdges.join(' '))
    }
  }
  if (networkViewTab !== undefined) {
    params.set(EMBED_PARAMS.networkViewTab, String(networkViewTab))
  }
  if (accessKey !== undefined) {
    params.set(EMBED_PARAMS.accessKey, accessKey)
  }
  return buildShareUrl(origin, baseName, networkId, params.toString())
}
