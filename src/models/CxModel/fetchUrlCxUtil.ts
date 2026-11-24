import { v4 as uuidv4 } from 'uuid'

import { logApi } from '../../debug'
import {
  NetworkProperty,
  NetworkSummary,
} from '../../models/NetworkSummaryModel'
import { createNetworkSummary } from '../../models/NetworkSummaryModel/impl/networkSummaryImpl'
import { ValueType, ValueTypeName } from '../../models/TableModel'
import { CyNetwork } from '../CyNetworkModel'
import { Visibility } from '../NetworkSummaryModel/Visibility'
import { Cx2 } from './Cx2'
import { getCyNetworkFromCx2 } from './impl'
import {
  getAttributeDeclarations,
  getNetworkAttributes,
  getNodes,
} from './impl/extractor'
export const fetchUrlCx = async (
  url: string,
  maxSize: number,
): Promise<{
  summary: NetworkSummary
  cyNetwork: CyNetwork
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
    // The HEAD Content-Length check above is only a fast-fail: the header
    // may be absent (chunked transfer, CORS). Enforce the limit on the
    // actual body before parsing (REVIEW.md B15 — previously a missing
    // header meant no limit at all)
    const body = await fullResponse.arrayBuffer()
    if (body.byteLength > maxSize) {
      throw new Error('CX network too large')
    }
    const data: Cx2 = JSON.parse(new TextDecoder().decode(body))

    const uuid = uuidv4()
    const network = getCyNetworkFromCx2(uuid, data)

    const networkAttributeDeclarations =
      getAttributeDeclarations(data)?.attributeDeclarations?.[0]
        ?.networkAttributes ?? {}
    const networkAttributes = getNetworkAttributes(data)?.[0] ?? {}

    const urlObj = new URL(url)
    const name =
      (network.networkAttributes?.attributes?.name as string) ||
      `${urlObj.host} (${new Date().toLocaleString()})`

    const description = networkAttributes.description ?? ''

    const properties: NetworkProperty[] = Object.entries(networkAttributes).map(
      ([key, value]) => {
        return {
          predicateString: key,
          value: value as ValueType,
          dataType:
            networkAttributeDeclarations[key]?.d ?? ValueTypeName.String,
          subNetworkId: null,
        }
      },
    )

    const nodes = getNodes(data)
    const hasLayout = nodes.some(
      (n) =>
        n.x !== undefined &&
        n.y !== undefined &&
        !Number.isNaN(n.x) &&
        !Number.isNaN(n.y),
    )

    const summary = createNetworkSummary({
      networkId: uuid,
      name,
      description,
      properties,
      hasLayout,
      visibility: Visibility.PUBLIC,
      nodeCount: network.network.nodes.length,
      edgeCount: network.network.edges.length,
    })
    return {
      summary,
      cyNetwork: network,
    }
  } catch (error) {
    logApi.error(`[${fetchUrlCx.name}]: Failed to fetch URL:`, error)
    throw error // Rethrow or handle as needed
  }
}
