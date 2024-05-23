// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'
import { NdexNetworkSummary } from '../../models/NetworkSummaryModel'
import { IdType } from '../../models/IdType'
import { getNetworkSummariesFromDb, putNetworkSummaryToDb } from '../persist/db'

// check the local cache for ndex network summaries and fetch from NDEx if not found
export const useNdexNetworkSummary = async (
  ndexNetworkId: IdType | IdType[],
  url: string,
  accessToken?: string,
): Promise<Record<IdType, NdexNetworkSummary>> => {
  try {
    const uniqueIds = Array.from(
      new Set(Array.isArray(ndexNetworkId) ? ndexNetworkId : [ndexNetworkId]),
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
    const newSummaries = await ndexSummaryFetcher(
      Array.from(nonCachedIds),
      url,
      accessToken,
    )
    const validNewSummaries = newSummaries.filter((s) => s !== undefined)
    validNewSummaries.forEach(async (summary: NdexNetworkSummary) => {
      await putNetworkSummaryToDb(summary)
    })
    const summaryResults: Record<IdType, NdexNetworkSummary> = [
      ...cachedSummaries.filter((s) => s !== undefined),
      ...validNewSummaries,
    ].reduce((acc: Record<IdType, NdexNetworkSummary>, s) => {
      acc[s.externalId] = s
      return acc
    }, {})

    return summaryResults
  } catch (error) {
    console.error('Failed to get network summary', error)
    throw error
  }
}

// fetch network summaries from NDEx
export const ndexSummaryFetcher = async (
  id: IdType | IdType[],
  url: string,
  accessToken?: string,
): Promise<NdexNetworkSummary[]> => {
  const ndexClient = new NDEx(url)

  if (accessToken !== undefined && accessToken !== '') {
    ndexClient.setAuthToken(accessToken)
  }

  const ids = Array.isArray(id) ? id : [id]

  try {
    const summaries: NdexNetworkSummary[] =
      await ndexClient.getNetworkSummariesByUUIDs(ids)

    const processedSummaries = summaries.map((s) => {
      return {
        ...s,
        isNdex: true,
        creationTime: new Date(s.creationTime),
        modificationTime: new Date(s.modificationTime),
      }
    })

    return processedSummaries
  } catch (error) {
    console.error('Failed to fetch summary', error)
    throw error
  }
}
