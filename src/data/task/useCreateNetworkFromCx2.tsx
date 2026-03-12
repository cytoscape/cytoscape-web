/**
 * @deprecated The Module Federation exposure of this hook (cyweb/CreateNetworkFromCx2) is deprecated for external apps.
 * This hook is still used internally by the host application — it is NOT being removed.
 * External apps should use `cyweb/NetworkApi` (`useNetworkApi`) instead of importing this hook directly.
 * This cyweb/CreateNetworkFromCx2 Module Federation export will be removed after 2 release cycles.
 */
import { useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'

import { useUrlNavigation } from '../hooks/navigation/useUrlNavigation'
import { useNetworkStore } from '../hooks/stores/NetworkStore'
import { useNetworkSummaryStore } from '../hooks/stores/NetworkSummaryStore'
import { useTableStore } from '../hooks/stores/TableStore'
import { useViewModelStore } from '../hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../hooks/stores/WorkspaceStore'
import { Cx2 } from '../../models/CxModel/Cx2'
import { createCyNetworkFromCx2 } from '../../models/CxModel/impl'
import { CyNetwork } from '../../models/CyNetworkModel'
import { NetworkSummary } from '../../models/NetworkSummaryModel'
import { createNetworkSummary } from '../../models/NetworkSummaryModel/impl/networkSummaryImpl'

/**
 * Props for creating a network with a view from a CX2 object.
 */
interface CreateNetworkFromCx2Props {
  /**
   * CX2 data to convert into a full network with view.
   */
  cxData: Cx2
  /**
   * Whether to add the new network to the workspace and set it as the current network.
   * @default true
   */
  addToWorkspace?: boolean
  /**
   * Whether to navigate to the new network after creation.
   * Requires addToWorkspace to be true to have effect.
   * @default true
   */
  navigate?: boolean
}

/**
 * A custom hook to return a function that creates a CyNetwork from CX2
 * and stores it in Zustand. Modeled after createNetwork in
 * [src/task/useCreateNetwork.tsx](src/task/useCreateNetwork.tsx).
 */
export const useCreateNetworkFromCx2 = (): ((
  props: CreateNetworkFromCx2Props,
) => CyNetwork) => {
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
    ({
      cxData,
      addToWorkspace = true,
      navigate = true,
    }: CreateNetworkFromCx2Props) => {
      // Convert CX2 to a fully populated CyNetwork
      const cyNetwork: CyNetwork = createCyNetworkFromCx2(uuidv4(), cxData)
      const {
        network,
        networkAttributes,
        nodeTable,
        edgeTable,
        visualStyle,
        networkViews,
      } = cyNetwork

      let summary: NetworkSummary

      if (networkAttributes) {
        const { attributes } = networkAttributes
        const name =
          (attributes['name'] as string) ?? `CX2 Network (${network.id})`
        const description = (attributes['description'] as string) ?? ''
        summary = createNetworkSummary({
          networkId: network.id,
          name,
          description,
          nodeCount: network.nodes.length,
          edgeCount: network.edges.length,
        })
        summary.version = (attributes['version'] as string) ?? 'unknown'
      } else {
        // Create a basic summary
        summary = createNetworkSummary({
          networkId: network.id,
          name: `CX2 Network (${network.id})`,
          nodeCount: network.nodes.length,
          edgeCount: network.edges.length,
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

      if (addToWorkspace) {
        // Add network to workspace
        addNetworkIds(network.id)

        // Select it as the current network
        setCurrentNetworkId(network.id)

        if (navigate) {
          navigateToNetwork({
            workspaceId: workspace.id,
            networkId: network.id,
            searchParams: new URLSearchParams(location.search),
            replace: false,
          })
        }
      }

      return cyNetwork
    },
    [
      addNetwork,
      addVisualStyle,
      addTable,
      addViewModel,
      addSummary,
      addNetworkIds,
      setCurrentNetworkId,
      navigateToNetwork,
      workspace,
    ],
  )

  return createNetworkFromCx
}
