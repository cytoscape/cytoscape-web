import { useTableStore } from '@/data/hooks/stores/TableStore'
import { useViewModelStore } from '@/data/hooks/stores/ViewModelStore'
import { useSubNetworkStore } from '@/features/HierarchyViewer/store/SubNetworkStore'
import { getSubNetworkId } from '@/features/HierarchyViewer/utils/subnetworkQueryUtil'
import { IdType } from '@/models/IdType'
import { EmbedParams } from './embedParams'

/**
 * Applies a link's selection to the network the embed just loaded. Ids the
 * network does not have are skipped.
 *
 * A plain network selects the nodes and edges. A hierarchy selects the first
 * id that is one of its subsystems, which opens that subsystem's interaction
 * network; the Cell View zooms to it, and the interaction network selects
 * `selectedSubnetworkNodes` once it has loaded. Both wait in SubNetworkStore
 * for the component that applies them.
 */
export const applyEmbedSelection = (
  networkId: IdType,
  params: EmbedParams,
  isHierarchy: boolean,
): void => {
  const tables = useTableStore.getState().tables[networkId]
  if (tables === undefined) {
    return
  }
  const { exclusiveSelect } = useViewModelStore.getState()
  const nodeIds = params.selectedNodes.filter((id) =>
    tables.nodeTable.rows.has(id),
  )

  if (isHierarchy) {
    const subsystemId: IdType | undefined = nodeIds[0]
    if (subsystemId === undefined) {
      return
    }
    exclusiveSelect(networkId, [subsystemId], [])
    const { requestCellViewFocus, requestUrlSelection } =
      useSubNetworkStore.getState()
    requestCellViewFocus(subsystemId)
    if (params.selectedSubnetworkNodes.length > 0) {
      requestUrlSelection({
        subNetworkId: getSubNetworkId(networkId, subsystemId),
        nodeIds: params.selectedSubnetworkNodes,
        edgeIds: [],
      })
    }
    return
  }

  const edgeIds = params.selectedEdges.filter((id) =>
    tables.edgeTable.rows.has(id),
  )
  if (nodeIds.length > 0 || edgeIds.length > 0) {
    exclusiveSelect(networkId, nodeIds, edgeIds)
  }
}
