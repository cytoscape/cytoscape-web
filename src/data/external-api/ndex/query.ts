/**
 * NDEx Query Operations
 *
 * Functions for executing queries on objects in NDEx.
 */
import { z } from 'zod'

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
  const outputCX2 = true

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

// NDEx answers `{ "<node id>": { "name": "<name>" }, ... }`. Only the outer
// shape is required; entries without a usable name are skipped one by one.
const NodeNameEntrySchema = z.object({
  name: z.string().refine((name) => name.trim() !== ''),
})

/**
 * Gets the `name` attribute of the given nodes, keyed by node id.
 *
 * Unlike {@link fetchGeneNamesFromIds}, the result keeps each name paired with
 * its id: the response is an object keyed by id, and reading its values back
 * by position only matches the request when the ids are 0..n-1 (#933).
 *
 * @param networkUUID - Network UUID in NDEx
 * @param ids - Node ids to get names for
 * @param accessToken - Optional authentication token
 * @param ndexUrl - Optional NDEx base URL (defaults to module configuration if not provided)
 * @returns Map from node id (as a decimal string) to its name. Nodes without a
 * name, or with a blank one, are left out.
 * @throws if the request fails or the response is not an object keyed by id
 */
export const fetchNodeNamesByIds = async (
  networkUUID: string,
  ids: number[],
  accessToken?: string,
  ndexUrl?: string,
): Promise<Map<string, string>> => {
  const ndexClient = getNdexClient(accessToken, ndexUrl)
  const response: unknown =
    await ndexClient.networks.getAttributesOfSelectedNodes(networkUUID, {
      ids,
      attributeNames: ['name'],
    })

  if (
    typeof response !== 'object' ||
    response === null ||
    Array.isArray(response)
  ) {
    throw new Error('Unexpected node name response from NDEx')
  }

  // Own keys of the response as parsed, into a Map: an id such as "__proto__"
  // stays plain data and is never assigned onto an object
  const names = new Map<string, string>()
  for (const [id, entry] of Object.entries(response)) {
    const named = NodeNameEntrySchema.safeParse(entry)
    if (named.success) {
      names.set(id, named.data.name)
    }
  }
  return names
}
