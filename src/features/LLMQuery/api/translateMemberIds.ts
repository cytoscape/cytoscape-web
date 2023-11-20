import config from '../../../assets/config.json'
import { IdType } from '../../../models/IdType'
import { getNdexClient } from '../../../utils/fetchers'

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
  const ndexClient = getNdexClient(ndexBaseUrl, accessToken)

  const geneNames = await ndexClient.getAttributesOfSelectedNodes(
    networkUUID,
    {
      ids,
      attributeNames: ['name'],
    },
    accessToken,
  )

  return geneNames
}
