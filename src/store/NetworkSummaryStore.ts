import create from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { IdType } from '../models/IdType'
import { NdexNetworkSummary } from '../models/NetworkSummaryModel'
import {
  deleteNetworkSummaryFromDb,
  getNetworkSummariesFromDb,
  getNetworkSummaryFromDb,
  putNetworkSummaryToDb,
} from './persist/db'
import { NDEx } from '@js4cytoscape/ndex-client'

interface NetworkSummaryStore {
  summaries: Record<IdType, NdexNetworkSummary>
}

interface NetworkSummaryActions {
  fetch: (networkId: IdType, url: string) => Promise<NdexNetworkSummary>
  fetchAll: (networkIds: IdType[], url: string) => Promise<void>
  remove: (networkId: IdType) => void
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
    summaries: {},
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
        // const newSummaries = new Map(state.summaries).set(networkId, newSummary)
        return {
          summaries: { ...state.summaries, newSummary },
        }
      })

      return newSummary
    },
    fetchAll: async (networkIds: IdType[], url: string) => {
      // Check local database first
      const localData: NdexNetworkSummary[] = await getNetworkSummariesFromDb(
        networkIds,
      )

      // "localdata" contains undefined if the list contains new network IDs

      const results: NdexNetworkSummary[] = []

      localData.forEach((summary) => {
        if (summary !== undefined) {
          results.push(summary)
        }
      })

      const newIds: IdType[] = networkIds.filter(
        (id) => !results.map((s) => s.externalId).includes(id),
      )

      let newSummaries: NdexNetworkSummary[] = []
      if (results.length !== 0) {
        const cached: NdexNetworkSummary[] = results
        newSummaries = (await networkSummaryFetcher(
          newIds,
          url,
        )) as NdexNetworkSummary[]

        newSummaries = [...cached, ...newSummaries]
        // Put those to DB
      } else {
        // NDEx server URL
        newSummaries = (await networkSummaryFetcher(
          networkIds,
          url,
        )) as NdexNetworkSummary[]
      }
      newSummaries.forEach(async (summary: NdexNetworkSummary) => {
        await putNetworkSummaryToDb(summary)
      })

      const newSummaryRecord: Record<IdType, NdexNetworkSummary> =
        newSummaries.reduce(
          (summary, entry) => ({
            ...summary,
            [entry.externalId]: entry,
          }),
          {},
        )

      set((state) => {
        if (newSummaries.length === 0) {
          return state
        }

        const newRecord = { ...state.summaries, ...newSummaryRecord }

        return {
          summaries: newRecord,
        }
      })

      // return newSummaries
    },
    remove: (networkId: IdType) => {
      set((state) => {
        const { summaries } = state
        const newSummaries: Record<IdType, NdexNetworkSummary> = {}
        Object.keys(summaries).forEach((key: IdType) => {
          if (key !== networkId) {
            newSummaries[key] = summaries[key]
          }
        })
        deleteNetworkSummaryFromDb(networkId)
          .then((val) => {
            console.log('Summary deleted', networkId, val)
          })
          .catch((err) => {
            console.error('', err)
          })

        return {
          summaries: { ...newSummaries },
        }
      })
    },
  })),
)
