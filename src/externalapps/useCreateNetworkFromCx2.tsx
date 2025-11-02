import { useCallback } from 'react'
import { Cx2 } from '../models/CxModel/Cx2'
import { NetworkWithView } from '../models/NetworkWithViewModel'
import {
  NdexNetworkSummary,
  getBaseSummary,
} from '../models/NetworkSummaryModel'
import { useNetworkStore } from '../hooks/stores/NetworkStore'
import { useTableStore } from '../hooks/stores/TableStore'
import { useViewModelStore } from '../hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../hooks/stores/VisualStyleStore'
import { useNetworkSummaryStore } from '../hooks/stores/NetworkSummaryStore'
import { createNetworkViewFromCx2 } from '../models/CxModel/impl'
import { v4 as uuidv4 } from 'uuid'
import { useWorkspaceStore } from '../hooks/stores/WorkspaceStore'
import { useUrlNavigation } from '../hooks/navigation/useUrlNavigation'

/**
 * Props for creating a network with a view from a CX2 object.
 */
interface CreateNetworkFromCx2Props {
  /**
   * CX2 data to convert into a full network with view.
   */
  cxData: Cx2
}

/**
 * A custom hook to return a function that creates a NetworkWithView from CX2
 * and stores it in Zustand. Modeled after createNetworkWithView in
 * [src/task/CreateNetwork.tsx](src/task/CreateNetwork.tsx).
 */
export const useCreateNetworkFromCx2 = (): ((
  props: CreateNetworkFromCx2Props,
) => NetworkWithView) => {
  const addNetwork = useNetworkStore((state) => state.add)
  const addTable = useTableStore((state) => state.add)
  const addViewModel = useViewModelStore((state) => state.add)
  const addVisualStyle = useVisualStyleStore((state) => state.add)
  const addSummary = useNetworkSummaryStore((state) => state.add)

  const addNetworkIds: (networkId: string) => void = useWorkspaceStore(
    (state) => state.addNetworkIds,
  )

  const setCurrentNetworkId: (networkId: string) => void = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )
  const { navigateToNetwork } = useUrlNavigation()
  const workspace = useWorkspaceStore((state) => state.workspace)

  const createNetworkFromCx = useCallback(
    ({ cxData }: CreateNetworkFromCx2Props) => {
      // Convert CX2 to a fully populated NetworkWithView
      const withView: NetworkWithView = createNetworkViewFromCx2(
        cxData,
        uuidv4(),
      )
      const {
        network,
        networkAttributes,
        nodeTable,
        edgeTable,
        visualStyle,
        networkViews,
      } = withView

      let summary: NdexNetworkSummary

      if (networkAttributes) {
        const { attributes } = networkAttributes
        const name =
          (attributes['name'] as string) ?? `CX2 Network (${network.id})`
        const description = (attributes['description'] as string) ?? ''
        summary = getBaseSummary({
          name,
          description,
          network,
        })
        summary.version = (attributes['version'] as string) ?? 'unknown'
      } else {
        // Create a basic summary
        summary = getBaseSummary({
          name: `CX2 Network (${network.id})`,
          network,
        })
      }

      // Do not apply layout to the network view
      summary.hasLayout = true

      // Store network data in Zustand
      addNetwork(network)
      addVisualStyle(network.id, visualStyle)
      addTable(network.id, nodeTable, edgeTable)
      addViewModel(network.id, networkViews[0]) // For now, just store the first view
      addSummary(network.id, summary)

      // Add network to workspace
      addNetworkIds(network.id)

      // Select it as the current network
      setCurrentNetworkId(network.id)
      navigateToNetwork({
        workspaceId: workspace.id,
        networkId: network.id,
        searchParams: new URLSearchParams(location.search),
        replace: false,
      })

      return withView
    },
    [addNetwork, addVisualStyle, addTable, addViewModel, addSummary],
  )

  return createNetworkFromCx
}
