import { logDb } from '../../debug'
import { IdType } from '../../models/IdType'
import { NetworkSummary } from '../../models/NetworkSummaryModel'
import { getNetworkSummariesFromDb, putNetworkSummaryToDb } from '../db'
import { fetchNdexSummaries } from '../external-api/ndex'
import { getNdexAccessKey } from '../external-api/ndex/accessKeys'
import { useCredentialStore } from './stores/CredentialStore'

/**
 * Hook that returns a function to load network summaries from cache or NDEx.
 *
 * Checks the local cache first, then fetches any missing summaries from NDEx.
 * Fetched summaries are automatically saved to the cache.
 *
 * When no accessToken is passed, the token is resolved from CredentialStore
 * only at the moment an NDEx fetch is actually needed — cached summaries
 * resolve without waiting for the boot SSO check.
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
      let newSummaries: NetworkSummary[] = []
      if (nonCachedIds.size > 0) {
        const token =
          accessToken ?? (await useCredentialStore.getState().getToken())
        // A share-link deep link can reach here before its summary is cached
        // (#807). NDEx takes one access key per request, so each network with
        // a remembered key is fetched on its own; the rest share one batch.
        const idsToFetch = Array.from(nonCachedIds)
        const keyedIds = idsToFetch.filter(
          (id) => getNdexAccessKey(id) !== undefined,
        )
        const batchIds = idsToFetch.filter(
          (id) => getNdexAccessKey(id) === undefined,
        )
        const results = await Promise.all([
          batchIds.length > 0 ? fetchNdexSummaries(batchIds, token) : [],
          ...keyedIds.map((id) =>
            fetchNdexSummaries(id, token, undefined, getNdexAccessKey(id)),
          ),
        ])
        newSummaries = results.flat()
      }
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
