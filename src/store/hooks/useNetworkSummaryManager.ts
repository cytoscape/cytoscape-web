import { useEffect } from 'react'
import { useNetworkStore } from '../NetworkStore'
import { useNetworkSummaryStore } from '../NetworkSummaryStore'
import { Network } from '../../models/NetworkModel'
import { UpdateEventType } from '../../models/StoreModel/NetworkStoreModel'

export const useNetworkSummaryManager = (): void => {
  const update = useNetworkSummaryStore((state) => state.update)
  const networks = useNetworkStore((state) => state.networks)

  // Last updated event
  const lastUpdated = useNetworkStore((state) => state.lastUpdated)

  useEffect(() => {
    if (lastUpdated === undefined) {
      return
    }

    const { networkId, type } = lastUpdated
    if (type === UpdateEventType.DELETE) {
      const network: Network | undefined = networks.get(networkId)
      if (network !== undefined) {
        update(networkId, {
          nodeCount: network.nodes.length,
          edgeCount: network.edges.length,
        })
      }
    }
  }, [lastUpdated])
}
