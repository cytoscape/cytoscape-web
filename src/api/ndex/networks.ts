/**
 * NDEx Network Operations
 *
 * Functions for fetching and managing networks from NDEx.
 */
// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'
import { Cx2 } from '../../models/CxModel/Cx2'
import { NdexNetworkSummary } from '../../models/NetworkSummaryModel'
import { IdType } from '../../models/IdType'
import { ValueType } from '../../models/TableModel/ValueType'
import { ValueTypeName } from '../../models/TableModel/ValueTypeName'
import { logApi } from '../../debug'
import { getNdexClient } from './client'

/**
 * Fetches a network from NDEx by UUID.
 *
 * @param ndexUuid - Network UUID in NDEx
 * @param url - NDEx server URL
 * @param accessToken - Optional authentication token
 * @returns Promise resolving to Cx2 network data
 */
export const fetchNetwork = async (
  ndexUuid: string,
  url: string,
  accessToken?: string,
): Promise<Cx2> => {
  const ndexClient = getNdexClient(url, accessToken)
  const cx2Network: Promise<Cx2> = ndexClient.getCX2Network(ndexUuid)
  return await cx2Network
}

/**
 * Utility function to process the network summary
 * in the future, we may change to getNetworkSummariesV3ByUUIDs
 * and discard/update this function
 */
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

/**
 * Fetches network summaries from NDEx.
 *
 * @param id - Network ID(s) to fetch summaries for
 * @param url - NDEx server URL
 * @param accessToken - Optional authentication token
 * @returns Promise resolving to array of processed network summaries
 */
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
    logApi.error(
      `[${ndexSummaryFetcher.name}]: Failed to fetch summary: ${error}`,
    )
    throw error
  }
}
