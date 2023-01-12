// import { IdType } from '../models/IdType'
// import { NdexNetworkSummary } from '../models/NetworkSummaryModel'
// import { getNetworkSummaryFromDb } from './persist/db'

// // @ts-expect-error-next-line
// import * as ndex from '@js4cytoscape/ndex-client'
// import { useContext } from 'react'
// import { AppConfigContext } from '../AppConfigContext'
// import { useNetworkSummaryStore } from './NetworkSummaryStore'

// const networkSummaryFetcher = async (
//   id: IdType,
//   url: string,
// ): Promise<NdexNetworkSummary> => {
//   // Try local DB first
//   const cachedSummary = await getNetworkSummaryFromDb(id)

//   if (cachedSummary !== undefined) {
//     return cachedSummary
//   }

//   const ndexClient = ndex.NDEx(url)
//   const summary: Promise<NdexNetworkSummary> = ndexClient.getNetworkSummary(id)
//   return await summary
// }

// /**
//  *
//  * @param id UUID of the network
//  * @param fetcher
//  * @returns
//  */
// export const useNdexNetworkSummary = (
//   id: IdType,
//   fetcher: (
//     id: IdType,
//     url: string,
//   ) => Promise<NdexNetworkSummary> = networkSummaryFetcher,
// ): NdexNetworkSummary => {
//   // NDEx server URL
//   const { ndexBaseUrl } = useContext(AppConfigContext)

//   // Check global state via zustand
//   const summaries: Map<IdType, NdexNetworkSummary> = useNetworkSummaryStore(
//     (state) => state.summaries,
//   )

//   const addSummary: (summary: NdexNetworkSummary) => void =
//     useNetworkSummaryStore((state) => state.add)

//   const summary: NdexNetworkSummary | undefined = summaries.get(id)

//   if (summary === undefined) {
//     // eslint-disable-next-line @typescript-eslint/no-throw-literal
//     throw fetcher(id, ndexBaseUrl).then((summary) => {
//       console.log('SUMMARY::::', summary)
//       addSummary(summary)
//     })
//   }
//   return summary
// }
