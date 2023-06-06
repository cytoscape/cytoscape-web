import { HcxMetaData } from '../model/HcxMetaData'
import { HcxMetaTag } from '../model/HcxMetaTag'

export const getHcxProps = (
  summaryObject: Record<string, any>,
): HcxMetaData | undefined => {
  const keys: string[] = Object.keys(summaryObject)

  if (keys.length === 0) {
    throw new Error('No summary object found')
  }

  if (keys.includes(HcxMetaTag.interactionNetworkUUID)) {
    // This is a hierarchy data with link to an interaction network
    const hcxMetaData: HcxMetaData = {
      interactionNetworkHost: summaryObject[HcxMetaTag.interactionNetworkHost],
      interactionNetworkUUID: summaryObject[HcxMetaTag.interactionNetworkUUID],
      modelFileCount: summaryObject[HcxMetaTag.modelFileCount],
    }

    return hcxMetaData
  }

  return undefined
}
