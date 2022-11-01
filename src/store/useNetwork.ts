/* eslint-disable @typescript-eslint/no-floating-promises */
/**
 * Custgom hook to get network object
 */
import { useEffect, useState } from 'react'
import { IdType } from '../models/IdType'
import NetworkFn, { Node, Edge, Network } from '../models/NetworkModel'
import { Cx2 } from '../utils/cx/Cx2'
import { db } from './persist/db'

const NETWORK_CACHE_NAME = 'cy-network-cache'

/**
 * Custom Hook to fetch data from remote or local Cache
 *
 * @param url
 * @returns
 */
export const useNetwork = (
  id: IdType,
  url: string,
  options?: any,
): { loading: boolean; error?: Error | undefined; data?: Network } => {
  const [status, setStatus] = useState<{
    loading: boolean
    error?: Error
    data?: Network
  }>({
    loading: false,
    data: undefined,
    error: undefined,
  })

  const fetchNetwork = async (
    id: IdType,
    url: string,
    options?: any,
  ): Promise<void> => {
    setStatus({ loading: true })

    // First, check the local IndexedDB cache
    // const networkFromDB: Network | undefined = await db.cyNetworks.get(id)

    const cache: Cache = await caches.open(NETWORK_CACHE_NAME)

    if (cache !== undefined) {
      const cacheResponse = await cache.match(url)
      if (cacheResponse !== undefined) {
        console.log('@@@@@@@@@@@@ LOCAL CACHE CALL ======================')
        const data = await cacheResponse.json()
        setStatus({ loading: false, data })
      } else {
        console.log(
          status.loading,
          '===============EXTERNAL API CALL ======================',
        )
        try {
          const response = await fetch(url)
          if (!response.ok) {
            throw new Error(`Error! status: ${response.status}`)
          }
          const data = (await response.json()) as Cx2
          const network = NetworkFn.createNetworkFromCx(data, id)
          const nodeList: Node[] = NetworkFn.nodes(network)
          const edgeList: Edge[] = NetworkFn.edges(network)
          await db.cyNetworks.put({
            id,
            nodes: nodeList,
            edges: edgeList,
          })

          await db.cyTables.put({
            id,
            nodeTable: NetworkFn.nodeTable(network),
            edgeTable: NetworkFn.edgeTable(network),
          })

          setStatus({ loading: false, data: network })
          // await cache.add(url)
        } catch (error: any) {
          setStatus({ ...status, loading: false, error })
        }
      }
    }
  }

  useEffect(() => {
    fetchNetwork(id, url, options)
    return () => {}
  }, [])

  return { ...status }
}
