/* eslint-disable @typescript-eslint/no-floating-promises */
/**
 * Custgom hook to get network object
 */
import { useEffect, useState } from 'react'
import { IdType } from '../models/IdType'
import NetworkFn, { Network } from '../models/NetworkModel'
import { Cx2 } from '../utils/cx/Cx2'
import { useNetworkStore } from './NetworkStore'
import { db, putNetworkToDb, addTables, getNetworkFromDB } from './persist/db'

// import { atom, useAtom } from 'jotai'
// import { useLiveQuery } from 'dexie-react-hooks'
// import { networkAtom } from './NetworkStore'

/**
 * Custom Hook to fetch data from remote or local Cache
 * State will be shared via globaz zustand store
 *
 *
 * @param url
 * @returns
 */
export const useNdexNetwork = (id: IdType, url: string): Network => {
  const addNewNetwork = useNetworkStore((state) => state.add)

  // Global state via zustand
  const networks: Record<IdType, Network> = useNetworkStore(
    (state) => state.networks,
  )

  const [network, setNetwork] = useState<Network>({
    id,
    nodes: [],
    edges: [],
  })

  // const [error, setError] = useState<Error | undefined>(undefined)

  const fetchNetwork = async (
    id: IdType,
    url: string,
    options?: any,
  ): Promise<void> => {
    try {
      // Try local DB first
      const cachedNet = await db.cyNetworks.get({ id })
      if (cachedNet === undefined) {
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Error! status: ${response.status}`)
        }
        const cxData: Cx2 = (await response.json()) as Cx2
        const network: Network = NetworkFn.createNetworkFromCx(cxData, id)

        // Add network to local IndexedDB
        putNetworkToDb(network)
        addTables(network)

        addNewNetwork(network)
        setNetwork(network)
      } else {
        const newNet: Network = await getNetworkFromDB(id)
        addNewNetwork(newNet)
        setNetwork(newNet)
      }
    } catch (err: any) {
      console.log(err)
      // setError(err)
    }
  }

  useEffect(() => {
    const network: Network | undefined = networks[id]
    if (network === undefined) {
      fetchNetwork(id, url)
    } else {
      setNetwork(network)
    }
    return () => {}
  }, [])

  return network
}
