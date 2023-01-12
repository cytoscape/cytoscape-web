import create from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { IdType } from '../models/IdType'
import { NdexNetworkSummary } from '../models/NetworkSummaryModel'
// import { getNetworkSummaryFromDb } from './persist/db'
// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'

interface NetworkSummaryStore {
  summaries: Map<IdType, NdexNetworkSummary>
}

interface NetworkSummaryActions {
  fetch: (networkId: IdType, url: string) => Promise<void>
  fetchAll: (networkIds: IdType[], url: string) => Promise<NdexNetworkSummary[]>
  delete: (networkId: IdType) => void
}

const networkSummaryFetcher = async (
  id: IdType | IdType[],
  url: string,
): Promise<NdexNetworkSummary | NdexNetworkSummary[]> => {
  // Try local DB first
  // const cachedSummary = await getNetworkSummaryFromDb(id)
  const cachedSummary = undefined

  if (cachedSummary !== undefined) {
    return cachedSummary
  }

  const ndexClient = new NDEx(`${url}/v2`)
  if (Array.isArray(id)) {
    const summaries: Promise<NdexNetworkSummary[]> =
      ndexClient.getNetworkSummariesByUUIDs(id)
    return await summaries
  } else {
    const summary: Promise<NdexNetworkSummary> =
      ndexClient.getNetworkSummary(id)
    return await summary
  }
}

export const useNetworkSummaryStore = create(
  immer<NetworkSummaryStore & NetworkSummaryActions>((set) => ({
    summaries: new Map<IdType, NdexNetworkSummary>(),
    fetch: async (networkId: IdType, url: string) => {
      const newSummary = (await networkSummaryFetcher(
        networkId,
        url,
      )) as NdexNetworkSummary

      set((state) => {
        const newSummaries = new Map(state.summaries).set(networkId, newSummary)
        return {
          ...state,
          summaries: newSummaries,
        }
      })
    },
    fetchAll: async (networkIds: IdType[], url: string) => {
      // NDEx server URL
      const newSummaries = (await networkSummaryFetcher(
        networkIds,
        url,
      )) as NdexNetworkSummary[]

      set((state) => {
        const newSummaryMap = new Map(state.summaries)
        newSummaries.forEach((summary, index) => {
          newSummaryMap.set(summary.externalId, summary)
        })
        return {
          ...state,
          summaries: newSummaryMap,
        }
      })

      return newSummaries
    },
    delete: (networkId: IdType) => {
      set((state) => {
        const { summaries } = state
        const deleted = summaries.delete(networkId)

        return {
          ...state,
          summaries: deleted,
        }
      })
    },
  })),
)
