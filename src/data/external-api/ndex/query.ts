/**
 * NDEx Query Operations
 *
 * Functions for executing queries on objects in NDEx.
 */
import { Cx2 } from '../../../models/CxModel/Cx2'
import { getNdexClient } from './client'

/**
 * Executes an interconnect query on NDEx to fetch a subnetwork.
 *
 * An interconnect query finds and returns a subnetwork within a larger network
 * based on query parameters. This is commonly used in hierarchy networks to
 * fetch subnetworks for specific subsystems.
 *
 * @param ndexUuid - Root network UUID in NDEx to query
 * @param parameters - Query parameters string (e.g., node IDs or search terms)
 * @param accessToken - Optional authentication token
 * @param ndexUrl - Optional NDEx base URL (defaults to module configuration if not provided)
 * @returns Promise resolving to Cx2 network data representing the query result
 */
export const fetchNdexInterconnectQuery = async (
  ndexUuid: string,
  parameters: string,
  accessToken?: string,
  ndexUrl?: string,
): Promise<Cx2> => {
  const ndexClient = getNdexClient(accessToken, ndexUrl)
  const searchTerms = ''
  const saveResult = false
  const outputCX2 = false

  const result = await ndexClient.networks.interConnectQuery(
    ndexUuid,
    searchTerms,
    saveResult,
    {
      nodeIds: parameters.split(',').map((id) => Number(id)),
    },
    outputCX2,
  )

  return result as Cx2
}

/**
 * Gets gene names from member IDs by fetching node attributes from NDEx.
 *
 * Fetches the 'name' attribute for the specified node IDs in a network.
 * This is useful for translating member IDs to their corresponding gene names.
 *
 * @param networkUUID - Network UUID in NDEx
 * @param ids - Array of member/node IDs to get gene names for
 * @param accessToken - Optional authentication token
 * @param ndexUrl - Optional NDEx base URL (defaults to module configuration if not provided)
 * @returns Promise resolving to array of gene names corresponding to the provided IDs
 */
export const fetchGeneNamesFromIds = async (
  networkUUID: string,
  ids: string[],
  accessToken?: string,
  ndexUrl?: string,
): Promise<string[]> => {
  const ndexClient = getNdexClient(accessToken, ndexUrl)
  const geneNameMap = await ndexClient.networks.getAttributesOfSelectedNodes(
    networkUUID,
    {
      ids: ids.map((id) => Number(id)),
      attributeNames: ['name'],
    },
  )

  const geneNames = Object.values(geneNameMap).map(
    (o: { name: string }) => o.name,
  )
  return geneNames
}
