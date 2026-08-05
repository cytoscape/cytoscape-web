import { logApi, logDb } from '../../debug'
import { Cx2 } from '../../models/CxModel/Cx2'
import { getCyNetworkFromCx2 } from '../../models/CxModel/impl'
import { CyNetwork } from '../../models/CyNetworkModel'
import { getCyNetworkFromDb, getNetworkSummaryFromDb } from '../db'
import { fetchNdexNetwork } from '../external-api/ndex'
import { takePrefetchedCyNetwork } from '../prefetch/networkPrefetch'
import { useCredentialStore } from './stores/CredentialStore'

/**
 * Hook that returns a function to load a CyNetwork from cache or NDEx.
 *
 * If the network is in cache, it's returned immediately.
 * If not in cache, it checks if the network is local-only:
 * - If local-only (isNdex: false), throws an error since local networks
 *   cannot be retrieved from NDEx. This prevents data loss by ensuring
 *   local networks are properly saved to IndexedDB.
 * - If NDEx network (or unknown), attempts to fetch from NDEx.
 *
 * @returns Function to load a CyNetwork from cache or NDEx
 */
export const useLoadCyNetwork = () => {
  const loadCyNetwork = async (
    networkId: string,
    accessToken?: string,
  ): Promise<CyNetwork> => {
    try {
      // First, check the local cache
      try {
        // Boot may have started this exact read at PUBLISH time; consuming it
        // here saves re-deserializing a large network. Falls through to a
        // fresh read (and the NDEx path below) on any miss or failure.
        const prefetched = takePrefetchedCyNetwork(networkId)
        if (prefetched !== undefined) {
          return await prefetched
        }
        const cyNetwork = await getCyNetworkFromDb(networkId)
        return cyNetwork
      } catch {
        // Cache miss - check if this is a local-only network
        const summary = await getNetworkSummaryFromDb(networkId)

        if (summary && !summary.isNdex) {
          // This is a local-only network that's not in cache
          // This can happen if IndexedDB was cleared or the network wasn't properly saved
          const errorMessage = `Local network "${summary.name}" (${networkId}) is not found in cache. Local networks are stored only in your browser and cannot be retrieved from NDEx. If you cleared your browser data, this network may have been lost.`
          logDb.error(`[${loadCyNetwork.name}]: ${errorMessage}`)
          throw new Error(errorMessage)
        }

        // Network is either on NDEx or we don't know - try fetching from NDEx.
        // Token is resolved lazily, only for this fetch path, so cached
        // networks above never wait for the boot SSO check.
        logDb.info(
          `[${loadCyNetwork.name}]: Cache miss for ${networkId}, fetching from NDEx`,
        )
        const token =
          accessToken ?? (await useCredentialStore.getState().getToken())
        const cxData: Cx2 = await fetchNdexNetwork(networkId, token)
        // getCyNetworkFromCx2 validates the CX2 data before processing
        return getCyNetworkFromCx2(networkId, cxData)
      }
    } catch (error) {
      logApi.error(`[${loadCyNetwork.name}]: Failed to get network: ${error}`)
      logDb.error(`[${loadCyNetwork.name}]: Failed to get network: ${error}`)
      throw error
    }
  }

  return loadCyNetwork
}
