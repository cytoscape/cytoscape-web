import { IdType } from '../../../IdType'
import { NetworkView, NodeView } from '../../../ViewModel'
import { VisualPropertyName } from '../../VisualPropertyName'
import { VisualPropertyValueType } from '../../VisualPropertyValue'
import { CyjsDirectMapper } from './CyjsStyleModels/CyjsDirectMapper'

export const createMapper = (networkView: NetworkView): CyjsDirectMapper[] => {
  const mappers: CyjsDirectMapper[] = []
  const { nodeViews } = networkView

  convertNodeViews(nodeViews)

  return mappers
}

/**
 * Extract all available vp values from nodeViews
 *
 * @param nodeViews
 */
export const convertNodeViews = (
  nodeViews: Record<IdType, NodeView>,
): CyjsDirectMapper[] => {
  const mappers: CyjsDirectMapper[] = []

  // All vp values contained in the nodeViews
  //   const vpNamesUsed = new Set<VisualPropertyName>()
  const ids: IdType[] = Object(nodeViews).keys()

  ids.forEach((id: IdType) => {
    const nv = nodeViews[id]
    const kvPair: Map<VisualPropertyName, VisualPropertyValueType> = nv.values
    console.log(kvPair)
  })

  return mappers
}
