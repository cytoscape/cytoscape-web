/* eslint-disable @typescript-eslint/no-floating-promises */
/**
 * Custgom hook to get network object
 */
import { useContext } from 'react'
import { AppConfigContext } from '../AppConfigContext'
import { IdType } from '../models/IdType'
import NetworkFn, { Network } from '../models/NetworkModel'
import { Cx2 } from '../utils/cx/Cx2'
import { useNetworkStore } from './NetworkStore'
import { putNetworkToDb, addTables, getNetworkFromDb } from './persist/db'

/**
 * Custom Hook to fetch data from remote or local Cache
 * State will be shared via globaz zustand store
 *
 *
 * @param url
 * @returns
 */
export const useNdexNetwork = (
  id: IdType,
  fetcher: (id: string, url: string) => Promise<Network> = networkFetcher,
): Network => {
  const { ndexBaseUrl } = useContext(AppConfigContext)
  const ndexUrl = `${ndexBaseUrl}/networks/${id}`

  // Network Store
  const addNewNetwork = useNetworkStore((state) => state.add)

  // Global state via zustand
  const networks: Record<IdType, Network> = useNetworkStore(
    (state) => state.networks,
  )

  const network: Network | undefined = networks[id]

  if (network === undefined) {
    // eslint-disable-next-line @typescript-eslint/no-throw-literal
    throw fetcher(id, ndexUrl).then((network: Network) =>
      addNewNetwork(network),
    )
  }
  return network
}

export const networkFetcher = async (
  id: IdType,
  url: string,
): Promise<Network> => {
  // Try local DB first
  const cachedNetwork = await getNetworkFromDb(id)
  if (cachedNetwork !== undefined) {
    return cachedNetwork
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Error! status: ${response.status}`)
  }
  const cxData: Cx2 = (await response.json()) as Cx2
  const network: Network = NetworkFn.createNetworkFromCx(cxData, id)

  // Add network to local IndexedDB
  putNetworkToDb(network)
  addTables(network)

  return network
}
