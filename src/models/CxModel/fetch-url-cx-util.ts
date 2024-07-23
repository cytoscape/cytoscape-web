import { NetworkWithView, createDataFromCx } from '../../utils/cx-utils'
import { NdexNetworkSummary } from '../../models/NetworkSummaryModel'
import { Cx2 } from './Cx2'
import { v4 as uuidv4 } from 'uuid'
import { Visibility } from '../NetworkSummaryModel/Visibility'
export const fetchUrlCx = async (
  url: string,
  maxSize: number,
): Promise<{
  summary: NdexNetworkSummary
  networkWithView: NetworkWithView
}> => {
  try {
    const response = await fetch(url, { method: 'HEAD' }) // Use HEAD request to get headers first
    const contentLength = response.headers.get('Content-Length')

    if (contentLength && parseInt(contentLength, 10) > maxSize) {
      // Example: 10MB limit
      throw new Error('CX network too large')
    }

    // If size is acceptable, make a GET request to actually fetch the data
    const fullResponse = await fetch(url)
    if (!fullResponse.ok) {
      throw new Error(`HTTP error! status: ${fullResponse.status}`)
    }
    const data: Cx2 = await fullResponse.json()
    const uuid = uuidv4()
    const network = await createDataFromCx(uuid, data)

    const summary = {
      isNdex: false,
      ownerUUID: uuid,
      name: (network.networkAttributes?.attributes?.name as string) || 'test',
      isReadOnly: false,
      subnetworkIds: [],
      isValid: false,
      warnings: [],
      isShowcase: false,
      isCertified: false,
      indexLevel: '',
      hasLayout: network.networkViews
        .map(
          (v) =>
            Object.values(v.nodeViews).filter(
              (nv) =>
                nv.x !== undefined &&
                nv.y !== undefined &&
                nv.x !== 0 &&
                nv.y !== 0,
            ).length > 0,
        )
        .reduce((acc, cur) => acc || cur, false),
      hasSample: false,
      cxFileSize: 0,
      cx2FileSize: 0,
      properties: [],
      owner: '',
      version: '',
      completed: false,
      visibility: 'PUBLIC' as Visibility,
      nodeCount: network.network.nodes.length,
      edgeCount: network.network.edges.length,
      description: 'test',
      creationTime: new Date(Date.now()),
      externalId: uuid,
      isDeleted: false,
      modificationTime: new Date(Date.now()),
    }
    return {
      summary,
      networkWithView: network,
    }
  } catch (error) {
    console.error('Failed to fetch URL:', error)
    throw error // Rethrow or handle as needed
  }
}
