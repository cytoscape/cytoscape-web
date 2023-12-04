import config from '../../../assets/config.json'
import { IdType } from '../../../models/IdType'
// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'

export const translateMemberIds = async ({
  networkUUID,
  ids,
  accessToken,
}: {
  networkUUID: IdType
  ids: string[]
  accessToken: string
}): Promise<string[]> => {
  const { ndexBaseUrl } = config
  const ndexClient = new NDEx(ndexBaseUrl)

  const geneNameMap = await ndexClient.getAttributesOfSelectedNodes(
    networkUUID,
    {
      ids,
      attributeNames: ['name'],
    },
  )

  const geneNames = Object.values(geneNameMap).map(
    (o: { name: string }) => o.name,
  )

  return geneNames
}
