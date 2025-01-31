import { Network } from '../../NetworkModel/Network'
import { NdexNetworkSummary } from '../NdexNetworkSummary'
import { Visibility } from '../Visibility'

interface BaseSummaryProps {
  name: string
  network: Network
  description?: string
}

export const getBaseSummary = ({
  name,
  network,
  description,
}: BaseSummaryProps): NdexNetworkSummary => {
  const creationTime = new Date(Date.now())

  const summary: NdexNetworkSummary = {
    isNdex: false,
    ownerUUID: '',
    name,
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
    version: '1.0.0',
    completed: false,
    visibility: Visibility.PUBLIC,
    nodeCount: network.nodes.length,
    edgeCount: network.edges.length,
    description: description || 'Created by Cytoscape Web.',
    creationTime,
    externalId: network.id,
    isDeleted: false,
    modificationTime: creationTime,
  }

  return summary
}
