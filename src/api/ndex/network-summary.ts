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
  getSingleTypeFromList,
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
      const isArray = Array.isArray(parsed)

      // Validate that the parsed result is an array
      if (!isArray) {
        logApi.warn(
          `[normalizeNdexSummaryValue]: Expected array for list type ${dataType}, got: ${typeof parsed}. Returning empty array.`,
        )
        return [] as ValueType
      }
      return parsed.map((v) =>
        deserializeValue(getSingleTypeFromList(dataType), v),
      ) as ValueType
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
 * @param ndexUrl - Optional NDEx base URL (defaults to module configuration if not provided)
 * @returns Promise resolving to array of processed network summaries
 */
export const fetchNdexSummaries = async (
  id: IdType | IdType[],
  accessToken?: string,
  ndexUrl?: string,
): Promise<NdexNetworkSummary[]> => {
  const ndexClient = getNdexClient(accessToken, ndexUrl)
  const ids = Array.isArray(id) ? id : [id]

  const summaries: NdexNetworkSummary[] =
    await ndexClient.getNetworkSummariesByUUIDs(ids)
  return normalizeNdexSummaries(summaries)
}

/**
 * Validates that a network has been successfully processed by NDEx.
 *
 * Polls NDEx a few times to check if the network validation is completed.
 * Used after creating or updating networks to check if NDEx validated them successfully.
 *
 * @param uuid - Network UUID
 * @param accessToken - Optional authentication token
 * @param ndexUrl - Optional NDEx base URL (defaults to module configuration if not provided)
 * @param options - Optional configuration for polling
 * @returns Promise resolving to true if validation succeeded, false otherwise
 */
export const getNetworkValidationStatus = async (
  uuid: string,
  accessToken?: string,
  ndexUrl?: string,
  options?: {
    maxAttempts?: number
    initialDelaySeconds?: number
    delaySeconds?: number
  },
): Promise<boolean> => {
  const maxAttempts = options?.maxAttempts ?? 10
  const initialDelaySeconds = options?.initialDelaySeconds ?? 0.5
  const delaySeconds = options?.delaySeconds ?? 1.0

  await waitSeconds(initialDelaySeconds)

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const summaries = await fetchNdexSummaries(uuid, accessToken, ndexUrl)
      const summary = summaries?.[0]
      const summaryIsValid = summary?.completed && !summary?.errorMessage

      // Check if validation is complete and successful
      if (summaryIsValid) {
        return true
      } else {
        logApi.warn(
          `[${getNetworkValidationStatus.name}]: Validation not complete for network ${uuid}: ${summary?.errorMessage}`,
          {
            summary,
          },
        )
      }

      // Not completed yet - wait before next attempt
      if (attempt < maxAttempts) {
        await waitSeconds(delaySeconds)
      }
    } catch (error) {
      // Log error and continue retrying
      logApi.warn(
        `[${getNetworkValidationStatus.name}]: Error during validation poll (attempt ${attempt}/${maxAttempts}):`,
        error,
      )

      // Wait before retrying (except on last attempt)
      if (attempt < maxAttempts) {
        await waitSeconds(delaySeconds)
      }
    }
  }

  // Max attempts reached - validation failed
  return false
}
