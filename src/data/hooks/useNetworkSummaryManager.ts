import { useEffect } from 'react'

import { Network } from '../../models/NetworkModel'
import { UpdateEventType } from '../../models/StoreModel/NetworkStoreModel'
import { useNetworkStore } from './stores/NetworkStore'
import { useNetworkSummaryStore } from './stores/NetworkSummaryStore'

/**
 * Hook to keep network summary counts (nodeCount/edgeCount) in sync with actual network data.
 * Updates the summary whenever a network is modified (nodes/edges added or removed).
 */
export const useNetworkSummaryManager = (): void => {
  const update = useNetworkSummaryStore((state) => state.update)
  const networks = useNetworkStore((state) => state.networks)

  // Last updated event - tracks when networks are modified
  const lastUpdated = useNetworkStore((state) => state.lastUpdated)

  useEffect(() => {
    if (lastUpdated === undefined) {
      return
    }

    const { networkId, type } = lastUpdated

    // When a network is modified (nodes/edges deleted), update the summary counts
    if (type === UpdateEventType.DELETE) {
      const network: Network | undefined = networks.get(networkId)
      if (network !== undefined) {
        // Update summary with current network counts
        update(networkId, {
          nodeCount: network.nodes.length,
          edgeCount: network.edges.length,
        })
      }
    }
  }, [lastUpdated, networks, update])
}
