// TODO: Make client TS compatible
// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'
import { Cx2 } from '../../../models/CxModel/Cx2'
import {
  NetworkWithView,
  createNetworkViewFromCx2,
} from '../../../utils/cx-utils'

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

export const ndexQueryFetcher = async (
  params: string[],
): Promise<NetworkWithView> => {
  const [url, uuid, query, accessToken] = params
  const ndexClient = new NDEx(url)

  if (accessToken !== undefined && accessToken !== '') {
    ndexClient.setAuthToken(accessToken)
  }

  // TODO: The client should be typed
  // const cx2QueryResult: Promise<Cx2> = ndexClient.interConnectQuery(uuid, query)
  const cx2QueryResult: Promise<Cx2> = ndexClient.interConnectQuery(
    uuid,
    null,
    false,
    query,
    true,
  )
  const cx2: Cx2 = await cx2QueryResult
  return createNetworkViewFromCx2(cx2)
}
