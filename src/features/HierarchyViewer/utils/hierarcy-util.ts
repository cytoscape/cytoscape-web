import { Visibility } from '../../../models/CxModel/NetworkSummary/Visibility'
import { NdexNetworkSummary } from '../../../models/NetworkSummaryModel'
import { ValueType } from '../../../models/TableModel'
import { HcxMetaData } from '../model/HcxMetaData'
import { HcxMetaTag } from '../model/HcxMetaTag'

export const getHcxProps = (
  summaryObject: Record<string, any>,
): HcxMetaData | undefined => {
  const keys: string[] = Object.keys(summaryObject)

  if (keys.length === 0) {
    // in the future, hcx will have more validation/error handling
    return undefined
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

export const createDummySummary = (
  uuid: string,
  name: string,
  nodeCount: number,
  edgeCount: number,
): NdexNetworkSummary => {
  const time: Date = new Date(Date.now())
  const summary: NdexNetworkSummary = {
    ownerUUID: '',
    isReadOnly: false,
    subnetworkIds: [],
    isValid: true,
    warnings: [],
    isShowcase: false,
    isCertified: false,
    indexLevel: 'NONE',
    hasLayout: true,
    hasSample: false,
    cxFileSize: 0,
    cx2FileSize: 0,
    name,
    properties: [],
    owner: '',
    version: '',
    completed: false,
    visibility: Visibility.PRIVATE,
    nodeCount,
    edgeCount,
    description: '',
    creationTime: time,
    externalId: uuid,
    isDeleted: false,
    modificationTime: time,
  }
  return summary
}

export const isHCX = (summary: NdexNetworkSummary): boolean => {
  if (summary === undefined) {
    return false
  }

  if (summary.properties === undefined || summary.properties.length === 0) {
    return false
  }

  const networkPropObj: Record<string, ValueType> = summary.properties.reduce<{
    [key: string]: ValueType
  }>((acc, prop) => {
    acc[prop.predicateString] = prop.value
    return acc
  }, {})
  const metadata: HcxMetaData | undefined = getHcxProps(networkPropObj)

  return metadata !== undefined
}
