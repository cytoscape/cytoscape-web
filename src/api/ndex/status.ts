/**
 * NDEx Status and Attribute Operations
 *
 * Functions for checking network status and translating member IDs.
 */
// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'
import { IdType } from '../../models/IdType'
import { waitSeconds } from '../../utils/wait-seconds'
import { ndexSummaryFetcher } from './networks'
import { getNdexClient } from './client'

export const TimeOutErrorIndicator = 'NDEx_TIMEOUT_ERROR'

/**
 * Translates member IDs to gene names by fetching attributes from NDEx.
 *
 * @param networkUUID - Network UUID in NDEx
 * @param ids - Array of member IDs to translate
 * @param url - NDEx server URL
 * @param accessToken - Optional authentication token
 * @returns Promise resolving to array of gene names
 */
export const translateMemberIds = async ({
  networkUUID,
  ids,
  accessToken,
  url,
}: {
  networkUUID: IdType
  ids: string[]
  url: string
  accessToken?: string
}): Promise<string[]> => {
  if (!url) {
    throw new Error('Server URL is not provided')
  }

  const ndexClient: NDEx = getNdexClient(url, accessToken)
  const geneNameMap = await ndexClient.getAttributesOfSelectedNodes(
    networkUUID,
    {
      ids,
      attributeNames: ['name'],
    },
    accessToken,
  )

  const geneNames = Object.values(geneNameMap).map(
    (o: { name: string }) => o.name,
  )
  return geneNames
}

/**
 * Gets the summary status of a network in NDEx.
 *
 * Polls NDEx until the network summary is completed or timeout occurs.
 *
 * @param uuid - Network UUID
 * @param baseUrl - NDEx base URL
 * @param accessToken - Authentication token
 * @returns Promise resolving to status object with rejection status and modification time
 */
export const getNDExSummaryStatus = async (
  uuid: string,
  baseUrl: string,
  accessToken: string,
): Promise<{ rejected: boolean; modificationTime?: Date }> => {
  const MAX_TRIES = 13
  let interval = 0.5
  let tries = 0

  await waitSeconds(0.2) // initial wait
  while (tries < MAX_TRIES) {
    tries += 1
    const newSummary = await ndexSummaryFetcher(uuid, baseUrl, accessToken)

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
