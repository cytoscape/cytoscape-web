import { fetchNdexSummaries } from '../api/ndex'
import { getNetworkSummariesFromDb, putNetworkSummaryToDb } from '../db'
import { logDb } from '../debug'
import { IdType } from '../models/IdType'
import { NetworkSummary } from '../models/NetworkSummaryModel'

/**
 * Hook that returns a function to load network summaries from cache or NDEx.
 *
 * Checks the local cache first, then fetches any missing summaries from NDEx.
 * Fetched summaries are automatically saved to the cache.
 *
 * @returns Function to load network summaries from cache or NDEx
 */
export const useLoadNetworkSummaries = () => {
  const loadNetworkSummaries = async (
    networkIds: IdType | IdType[],
    accessToken?: string,
  ): Promise<Record<IdType, NetworkSummary>> => {
    try {
      const uniqueIds = Array.from(
        new Set(Array.isArray(networkIds) ? networkIds : [networkIds]),
      )

      // check cache to see if we have the summaries
      const cachedSummaries = await getNetworkSummariesFromDb(uniqueIds)

      // get the ids that are not in the cache
      const nonCachedIds = new Set(uniqueIds)
      cachedSummaries.forEach((s) => {
        const summaryFound = s !== undefined
        if (summaryFound) {
          nonCachedIds.delete(s.externalId)
        }
      })

      // fetch summaries not found in the cache in NDEx
      // and then save them to the cache
      const newSummaries = await fetchNdexSummaries(
        Array.from(nonCachedIds),
        accessToken,
      )
      const validNewSummaries = newSummaries.filter((s) => s !== undefined)
      validNewSummaries.forEach(async (summary: NetworkSummary) => {
        await putNetworkSummaryToDb(summary)
      })
      const summaryResults: Record<IdType, NetworkSummary> = [
        ...cachedSummaries.filter((s) => s !== undefined),
        ...validNewSummaries,
      ].reduce((acc: Record<IdType, NetworkSummary>, s) => {
        acc[s.externalId] = s
        return acc
      }, {})

      return summaryResults
    } catch (error) {
      logDb.error(
        `[${loadNetworkSummaries.name}]: Failed to get network summary: ${error}`,
      )
      throw error
    }
  }

  return loadNetworkSummaries
}

