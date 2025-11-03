/**
 * NDEx Status and Attribute Operations
 *
 * Functions for checking network status and translating member IDs.
 */
// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'
import { IdType } from '../../models/IdType'
import { getNdexClient } from './client'

/**
 * Translates member IDs to gene names by fetching attributes from NDEx.
 *
 * @param networkUUID - Network UUID in NDEx
 * @param ids - Array of member IDs to translate
 * @param accessToken - Optional authentication token
 * @returns Promise resolving to array of gene names
 */
export const translateMemberIds = async ({
  networkUUID,
  ids,
  accessToken,
}: {
  networkUUID: IdType
  ids: string[]
  accessToken?: string
}): Promise<string[]> => {
  const ndexClient: NDEx = getNdexClient(accessToken)
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
