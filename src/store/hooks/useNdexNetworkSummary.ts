// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'
import { NdexNetworkSummary } from '../../models/NetworkSummaryModel'
import { IdType } from '../../models/IdType'
import { getNetworkSummariesFromDb, putNetworkSummaryToDb } from '../persist/db'
import { ValueType } from '../../models/TableModel/ValueType'
import { ValueTypeName } from '../../models/TableModel/ValueTypeName'
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
    return processSummary(summaries)
  } catch (error) {
    console.error('Failed to fetch summary', error)
    throw error
  }
}

// Utility function to process the network summary
// in the future, we may change to getNetworkSummariesV3ByUUIDs
// and discard/update this function
const processSummary = (
  summaries: NdexNetworkSummary[],
): NdexNetworkSummary[] => {
  return summaries.map((summary) => {
    const updatedProperties = summary.properties.map((property) => {
      let updatedValue: ValueType

      switch (property.dataType) {
        case ValueTypeName.String:
          updatedValue = String(property.value)
          break

        case ValueTypeName.Integer:
        case ValueTypeName.Long:
        case ValueTypeName.Double:
          updatedValue = Number(property.value)
          break

        case ValueTypeName.Boolean:
          updatedValue = property.value === 'true'
          break

        case ValueTypeName.ListString:
          updatedValue = JSON.parse(property.value as string)
          break

        case ValueTypeName.ListInteger:
        case ValueTypeName.ListLong:
        case ValueTypeName.ListDouble:
          updatedValue = JSON.parse(property.value as string).map(Number)
          break

        case ValueTypeName.ListBoolean:
          updatedValue = JSON.parse(property.value as string).map(
            (v: string) => v === 'true',
          )
          break

        default:
          updatedValue = property.value
      }

      return {
        ...property,
        value: updatedValue,
      }
    })

    return {
      ...summary,
      properties: updatedProperties,
      isNdex: true,
      version: summary.version ?? '',
      description: summary.description ?? '',
      name: summary.name ?? '',
      creationTime: new Date(summary.creationTime),
      modificationTime: new Date(summary.modificationTime),
    }
  })
}
