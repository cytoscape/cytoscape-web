// TODO: Make client TS compatible
// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'
import { Cx2 } from '../../../models/CxModel/Cx2'

// /**
//  *
//  * A custom hook to query network from NDEx
//  *
//  * @param ndexNetworkId
//  * @param query A query string, usually a list of genes
//  * @param url
//  * @param accessToken
//  * @returns
//  */
// export const useQueryNetwork = async (
//   ndexNetworkId: string,
//   query: string,
//   url: string,
//   accessToken?: string,
// ): Promise<FullNetworkData> => {
//   try {
//     return await createDataFromQueryResult(
//       ndexNetworkId,
//       query,
//       url,
//       accessToken,
//     )
//   } catch (error) {
//     console.error('Failed to run query network', error)
//     throw error
//   }
// }

/**
 *
 * @param ndexNetworkId
 * @param url
 * @returns
 */
// const createDataFromQueryResult = async (
//   ndexNetworkId: string,
//   query: string,
//   url: string,
//   accessToken?: string,
// ): Promise<FullNetworkData> => {
//   const { cxData, error } = useSWR<Cx2>(
//     [url, ndexNetworkId, query, accessToken],
//     ndexQueryFetcher,
//   )

//   const network: Network = NetworkFn.createNetworkFromCx(ndexNetworkId, cxData)
//   const [nodeTable, edgeTable]: [Table, Table] = TableFn.createTablesFromCx(
//     ndexNetworkId,
//     cxData,
//   )
//   const visualStyle: VisualStyle = VisualStyleFn.createVisualStyleFromCx(cxData)

//   const networkView: NetworkView = ViewModelFn.createViewModelFromCX(
//     ndexNetworkId,
//     cxData,
//   )

//   return { network, nodeTable, edgeTable, visualStyle, networkView }
// }

export const ndexQueryFetcher = async (params: string[]): Promise<Cx2> => {
  const [url, uuid, query, accessToken] = params
  const ndexClient = new NDEx(url)

  if (accessToken !== undefined && accessToken !== '') {
    ndexClient.setAuthToken(accessToken)
  }

  // TODO: The client should be typed
  const cx2QueryResult: Promise<Cx2> = ndexClient.interConnectQuery(uuid, query)

  return await cx2QueryResult
}
