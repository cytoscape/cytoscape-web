import { Visibility } from '../Visibility'

interface BaseSummaryProps {
  uuid: string
  newNetworkName: string
  newNetworkDescription: string
}

export const getBaseSummary = ({
  uuid,
  newNetworkName,
  newNetworkDescription,
}: BaseSummaryProps) => {
  const baseSummary = {
    ownerUUID: uuid,
    name: newNetworkName,
    isReadOnly: false,
    subnetworkIds: [],
    isValid: false,
    warnings: [],
    isShowcase: false,
    isCertified: false,
    indexLevel: '',
    hasLayout: false,
    hasSample: false,
    cxFileSize: 0,
    cx2FileSize: 0,
    properties: [],
    owner: '',
    version: '',
    completed: false,
    visibility: 'PUBLIC' as Visibility,
    nodeCount: 0,
    edgeCount: 0,
    description: newNetworkDescription,
    creationTime: new Date(Date.now()),
    externalId: uuid,
    isDeleted: false,
    modificationTime: new Date(Date.now()),
  }

  return baseSummary
}
