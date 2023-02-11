import { Aspect } from '../../../utils/cx/Cx2/Aspect'
import { CxDescriptor } from '../../../utils/cx/Cx2/CxDescriptor'
import { MetaData } from '../../../utils/cx/Cx2/MetaData'
import { Status } from '../../../utils/cx/Cx2/Status'
import { NetworkView } from '../../ViewModel'
import { VisualProperty } from '../VisualProperty'
import { VisualPropertyGroup } from '../VisualPropertyGroup'
import { VisualPropertyValueType } from '../VisualPropertyValue'
import { VisualStyle } from '../VisualStyle'
import { NetworkViewSources, VisualStyleFn } from '../VisualStyleFn'
import { defaultVisualStyle } from './DefaultVisualStyle'
import { createNewNetworkView } from './visualStyle-utils'

const applyVisualStyle = (data: NetworkViewSources): NetworkView => {
  const { network, visualStyle, nodeTable, edgeTable } = data

  const newNetworkView: NetworkView = createNewNetworkView(
    network,
    visualStyle,
    nodeTable,
    edgeTable,
  )

  return newNetworkView
}

// export const createDiscreteMappingFromCx = (
//   cxMapping: CXDiscreteMappingFunction<CXVisualPropertyValue>,
// ): DiscreteMappingFunction => {
//   const vpValueMap = new Map<ValueType, VisualPropertyValueType>()
//   cxMapping.definition.map.forEach((mapEntry) => {
//     const { v, vp } = mapEntry
//     vpValueMap.set(v, converter.valueConverter(vp))
//   })
//   return {
//     type: MappingFunctionType.Discrete,
//     attribute: cxMapping.definition.attribute,
//     vpValueMap,
//     defaultValue:
//   }
// }

const nodeVisualProperties = (
  visualStyle: VisualStyle,
): Array<VisualProperty<VisualPropertyValueType>> => {
  return Object.values(visualStyle).filter(
    (value) => value.group === VisualPropertyGroup.Node,
  )
}

const edgeVisualProperties = (
  visualStyle: VisualStyle,
): Array<VisualProperty<VisualPropertyValueType>> => {
  return Object.values(visualStyle).filter(
    (value) => value.group === VisualPropertyGroup.Edge,
  )
}

const networkVisualProperties = (
  visualStyle: VisualStyle,
): Array<VisualProperty<VisualPropertyValueType>> => {
  return Object.values(visualStyle).filter(
    (value) => value.group === VisualPropertyGroup.Network,
  )
}

const createVisualStyle = (): VisualStyle => {
  // create new copy of the default style instead of returning the same instance
  return { ...defaultVisualStyle }
}

export const VisualStyleFnImpl: VisualStyleFn = {
  createVisualStyle,
  createVisualStyleFromCx: function (
    cx:
      | [CxDescriptor, ...Aspect[], Status]
      | [CxDescriptor, ...Aspect[], MetaData, Status]
      | [CxDescriptor, MetaData, ...Aspect[], Status]
      | [CxDescriptor, MetaData, ...Aspect[], MetaData, Status],
  ): VisualStyle {
    throw new Error('Function not implemented.')
  },

  applyVisualStyle,
  nodeVisualProperties,
  edgeVisualProperties,
  networkVisualProperties,
}
