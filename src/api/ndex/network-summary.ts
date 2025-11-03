/**
 * NDEx Network Summary Operations
 *
 * Functions for fetching and managing network summaries from NDEx.
 */
import { NdexNetworkSummary } from '../../models/NetworkSummaryModel'
import { IdType } from '../../models/IdType'
import { ValueType } from '../../models/TableModel/ValueType'
import { ValueTypeName } from '../../models/TableModel/ValueTypeName'
import {
  deserializeValue,
  isListType,
} from '../../models/TableModel/impl/ValueTypeImpl'
import { logApi } from '../../debug'
import { getNdexClient } from './client'
import { waitSeconds } from '../../utils/wait-seconds'

export const TimeOutErrorIndicator = 'NDEx_TIMEOUT_ERROR'

/**
 * Normalizes a property value from NDEx format.
 *
 * NDEx returns property values as strings, with lists as JSON-encoded strings.
 * This function converts them to the appropriate types:
 * - Single values: Uses deserializeValue from ValueTypeImpl
 * - List values: Parses JSON first, then converts elements
 *
 * @param value - The raw value from NDEx (string for single values, JSON string for lists)
 * @param dataType - The expected value type
 * @returns The deserialized value with correct type
 */
const normalizeNdexSummaryValue = (
  value: ValueType,
  dataType: ValueTypeName,
): ValueType => {
  if (isListType(dataType)) {
    // NDEx returns list values as JSON strings, e.g., '["tag1", "tag2"]'
    try {
      const parsed = JSON.parse(value as string)

      // Validate that the parsed result is an array
      if (!Array.isArray(parsed)) {
        logApi.warn(
          `[normalizeNdexSummaryValue]: Expected array for list type ${dataType}, got: ${typeof parsed}. Returning empty array.`,
        )
        return [] as ValueType
      }

      // Convert array elements based on the list type
      switch (dataType) {
        case ValueTypeName.ListString:
          return parsed as ValueType

        case ValueTypeName.ListInteger:
        case ValueTypeName.ListLong:
        case ValueTypeName.ListDouble:
          return parsed.map(Number) as ValueType

        case ValueTypeName.ListBoolean:
          return parsed.map((v: string) => v === 'true') as ValueType

        default:
          return parsed as ValueType
      }
    } catch (error) {
      // Handle JSON parse errors - return empty array for invalid JSON
      logApi.warn(
        `[normalizeNdexSummaryValue]: Failed to parse JSON for list type ${dataType}: ${error}. Value: ${String(value)}. Returning empty array.`,
      )
      return [] as ValueType
    }
  } else {
    // For single values, NDEx returns plain strings that can be deserialized directly
    // Try to use deserializeValue from ValueTypeImpl, but fall back to preserving the value
    // for unknown types to maintain backward compatibility
    try {
      return deserializeValue(dataType, String(value))
    } catch {
      // For unknown types, preserve the original value (matches original behavior)
      return value
    }
  }
}

/**
 * Normalizes network summaries from NDEx.
 *
 * Converts raw summary data from NDEx into properly typed summaries by:
 * - Converting property values to their correct types (string, number, boolean, arrays)
 * - Setting default values for optional fields
 * - Converting date strings to Date objects
 * - Marking summaries as NDEx sources
 *
 * Note: In the future, we may change to getNetworkSummariesV3ByUUIDs
 * and discard/update this function.
 */
export const normalizeNdexSummaries = (
  summaries: NdexNetworkSummary[],
): NdexNetworkSummary[] => {
  return summaries.map((summary) => {
    const normalizedProperties = summary.properties.map((property) => {
      const normalizedValue = normalizeNdexSummaryValue(
        property.value,
        property.dataType,
      )

      return {
        ...property,
        value: normalizedValue,
      }
    })

    return {
      ...summary,
      properties: normalizedProperties,
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
 * @param accessToken - Optional authentication token
 * @returns Promise resolving to array of processed network summaries
 */
export const fetchNdexSummaries = async (
  id: IdType | IdType[],
  accessToken?: string,
): Promise<NdexNetworkSummary[]> => {
  const ndexClient = getNdexClient(accessToken)

  const ids = Array.isArray(id) ? id : [id]

  try {
    const summaries: NdexNetworkSummary[] =
      await ndexClient.getNetworkSummariesByUUIDs(ids)
    return normalizeNdexSummaries(summaries)
  } catch (error) {
    logApi.error(
      `[${fetchNdexSummaries.name}]: Failed to fetch summary: ${error}`,
    )
    throw error
  }
}

/**
 * Gets the network validation status from NDEx.
 *
 * Polls NDEx until the network validation is completed or timeout occurs.
 * Used after creating or updating networks to check if NDEx validated them successfully.
 *
 * @param uuid - Network UUID
 * @param accessToken - Authentication token
 * @returns Promise resolving to validation result with rejection status and modification time
 */
export const getNetworkValidationStatus = async (
  uuid: string,
  accessToken: string,
): Promise<{ rejected: boolean; modificationTime?: Date }> => {
  const MAX_TRIES = 13
  let interval = 0.5
  let tries = 0

  await waitSeconds(0.2) // initial wait
  while (tries < MAX_TRIES) {
    tries += 1
    const newSummary = await fetchNdexSummaries(uuid, accessToken)

    if (newSummary[0].completed === true) {
      if (newSummary[0].errorMessage) {
        return {
          rejected: true,
        }
      }
      return {
        rejected: false,
        modificationTime: newSummary[0].modificationTime,
      }
    }
    if (tries >= 10) {
      // after 10 tries, increase the interval to 5 seconds
      interval = 5
    } else if (tries >= 3) {
      // after 3 tries, increase the interval to 1 second
      interval = 1
    }
    await waitSeconds(interval)
  }
  throw new Error(TimeOutErrorIndicator)
}

// Deprecated exports for backward compatibility
/** @deprecated Use fetchSummaries instead */
export const fetchSummary = fetchNdexSummaries
/** @deprecated Use fetchSummaries instead */
export const ndexSummaryFetcher = fetchNdexSummaries
/** @deprecated Use getNetworkValidationStatus instead */
export const waitForNetworkValidation = getNetworkValidationStatus
/** @deprecated Use getNetworkValidationStatus instead */
export const fetchSummaryStatus = getNetworkValidationStatus
