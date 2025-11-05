/**
 * Network Attributes Converter from CX2
 *
 * Converts CX2 format data to NetworkAttributes.
 */
import { IdType } from '../../../IdType'
import { NetworkAttributes } from '../../../TableModel/NetworkAttributes'
import { ValueType } from '../../../TableModel/ValueType'
import { Cx2 } from '../../Cx2'
import { NetworkAttributeValue } from '../../Cx2/CoreAspects/NetworkAttributes'
import * as cxUtil from '../extractor'

/**
 * Create network attributes from CX2 format
 *
 * @param networkId - Network ID
 * @param cx - CX2 data object
 * @returns NetworkAttributes instance
 */
export const createNetworkAttributesFromCx = (
  networkId: IdType,
  cx: Cx2,
): NetworkAttributes => {
  const networkAttributes: NetworkAttributes = {
    id: networkId,
    attributes: {},
  }

  const cxNetworkAttributes: NetworkAttributeValue[] =
    cxUtil.getNetworkAttributes(cx)
  cxNetworkAttributes.forEach((attr: NetworkAttributeValue) => {
    const newAttributes = { ...networkAttributes.attributes, ...attr }
    networkAttributes.attributes = newAttributes as Record<string, ValueType>
  })

  return networkAttributes
}
