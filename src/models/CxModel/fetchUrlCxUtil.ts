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
    const data: Cx2 = await fullResponse.json()

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

    const hasLayout = network.networkViews
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
      .reduce((acc, cur) => acc || cur, false)

    const summary = createNetworkSummary({
      networkId: uuid,
      name,
      description,
      properties,
      hasLayout,
      visibility: Visibility.PUBLIC,
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
