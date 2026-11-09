import { ACCESS_KEY_QUERY_KEY } from '@/data/external-api/ndex/accessKeys'
import { SelectionStates } from '@/features/FloatingToolBar/useCopyShareableNetworkUrl'
import { IdType } from '@/models/IdType'

/**
 * Query parameters the embed reads. The names are the full app's deep-link
 * names (ROUTING_SPECIFICATION.md), so a full-app link becomes an embed link
 * by replacing `/<workspace>/networks/` with `/embed/`.
 */
export const EMBED_PARAMS = {
  selectedNodes: SelectionStates.SelectedNodes,
  selectedEdges: SelectionStates.SelectedEdges,
  selectedSubnetworkNodes: 'selectedSubnetworkNodes',
  networkViewTab: 'activeNetworkViewTab',
  accessKey: ACCESS_KEY_QUERY_KEY,
} as const

/** Hierarchy tabs, counted as the full app counts them. */
export const TREE_VIEW_TAB_INDEX = 0
export const CELL_VIEW_TAB_INDEX = 1

export interface EmbedParams {
  /** Nodes of the network, or subsystems of a hierarchy. */
  selectedNodes: IdType[]
  selectedEdges: IdType[]
  /** Nodes of the selected subsystem's interaction network. */
  selectedSubnetworkNodes: IdType[]
  /** Hierarchy tab to show first. Undefined when the link names none. */
  networkViewTab?: number
  /** NDEx share-link key. Undefined when the link has none. */
  accessKey?: string
}

const readIds = (params: URLSearchParams, name: string): IdType[] =>
  (params.get(name) ?? '').split(/\s+/).filter((id) => id !== '')

/**
 * Reads the embed's parameters. Ids are space-separated (`+` or `%20` in the
 * URL). A tab that is not a non-negative integer is ignored. Every other
 * parameter is ignored, including the full app's panel and filter parameters.
 */
export const readEmbedParams = (search: string): EmbedParams => {
  const params = new URLSearchParams(search)
  const tab = params.get(EMBED_PARAMS.networkViewTab) ?? ''
  const accessKey = params.get(EMBED_PARAMS.accessKey)
  return {
    selectedNodes: readIds(params, EMBED_PARAMS.selectedNodes),
    selectedEdges: readIds(params, EMBED_PARAMS.selectedEdges),
    selectedSubnetworkNodes: readIds(
      params,
      EMBED_PARAMS.selectedSubnetworkNodes,
    ),
    ...(/^\d+$/.test(tab) ? { networkViewTab: Number(tab) } : {}),
    ...(accessKey ? { accessKey } : {}),
  }
}
