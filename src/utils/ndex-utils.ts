import { IdType } from '../models/IdType'
// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'
import { getNdexClient } from './fetchers'

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
