import { Cx2 } from '../../CxModel/Cx2'
import { NetworkAttributeValue } from '../../CxModel/Cx2/CoreAspects/NetworkAttributes'
import { NetworkAttributes } from '../NetworkAttributes'
import * as cxUtil from '../../CxModel/cx2-util'
import { IdType } from '../../IdType'
import { ValueType } from '../ValueType'

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
