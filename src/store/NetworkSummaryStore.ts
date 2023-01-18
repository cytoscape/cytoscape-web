import create from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { IdType } from '../models/IdType'
import { NdexNetworkSummary } from '../models/NetworkSummaryModel'
import {
  getNetworkSummariesFromDb,
  getNetworkSummaryFromDb,
  putNetworkSummaryToDb,
} from './persist/db'
// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'

interface NetworkSummaryStore {
  summaries: Map<IdType, NdexNetworkSummary>
}

interface NetworkSummaryActions {
  fetch: (networkId: IdType, url: string) => Promise<NdexNetworkSummary>
  fetchAll: (networkIds: IdType[], url: string) => Promise<void>
  delete: (networkId: IdType) => void
}

const networkSummaryFetcher = async (
  id: IdType | IdType[],
  url: string,
): Promise<NdexNetworkSummary | NdexNetworkSummary[]> => {
  const ndexClient = new NDEx(`${url}/v2`)
  if (Array.isArray(id)) {
    const summaries: Promise<NdexNetworkSummary[]> =
      await ndexClient.getNetworkSummariesByUUIDs(id)

    return await summaries
  } else {
    // Try local DB first
    const cachedSummary = await getNetworkSummaryFromDb(id)
    if (cachedSummary !== undefined) {
      return cachedSummary
    }
    const summary: Promise<NdexNetworkSummary> =
      ndexClient.getNetworkSummary(id)
    return await summary
  }
}

export const useNetworkSummaryStore = create(
  immer<NetworkSummaryStore & NetworkSummaryActions>((set) => ({
    summaries: new Map<IdType, NdexNetworkSummary>(),
    fetch: async (networkId: IdType, url: string) => {
      const localData: NdexNetworkSummary | undefined =
        await getNetworkSummaryFromDb(networkId)
      if (localData !== undefined) {
        return localData
      }

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

      return newSummary
    },
    fetchAll: async (networkIds: IdType[], url: string) => {
      // Check local database first
      const localData: NdexNetworkSummary[] = await getNetworkSummariesFromDb(
        networkIds,
      )

      const results: NdexNetworkSummary[] = []
      localData.forEach((summary) => {
        if (summary !== undefined) {
          results.push(summary)
        }
      })

      let newSummaries: NdexNetworkSummary[] = []
      if (results.length !== 0) {
        newSummaries = results
      } else {
        // NDEx server URL
        newSummaries = (await networkSummaryFetcher(
          networkIds,
          url,
        )) as NdexNetworkSummary[]

        // Put those to DB
        newSummaries.forEach(async (summary: NdexNetworkSummary) => {
          await putNetworkSummaryToDb(summary)
        })
      }

      set((state) => {
        if (newSummaries.length === 0) {
          return state
        }

        const newSummaryMap = new Map(state.summaries)
        newSummaries.forEach((summary, index) => {
          newSummaryMap.set(summary.externalId, summary)
        })
        return {
          ...state,
          summaries: newSummaryMap,
        }
      })

      // return newSummaries
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
