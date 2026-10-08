import { NetworkView } from '../../ViewModel'
import {
  NetworkViewSources,
  VisualProperty,
  VisualPropertyGroup,
  VisualPropertyValueType,
  VisualStyle,
} from '..'
import { createNewNetworkView, updateNetworkView } from './computeViewUtil'
import { getDefaultVisualStyle } from './defaultVisualStyle'

const sortByDisplayName = (
  a: VisualProperty<VisualPropertyValueType>,
  b: VisualProperty<VisualPropertyValueType>,
) => {
  const nameA = a.displayName.toLowerCase()
  const nameB = b.displayName.toLowerCase()
  if (nameA < nameB) {
    return -1
  } else if (nameA > nameB) {
    return 1
  }
  return 0
}

export const applyVisualStyle = (data: NetworkViewSources): NetworkView => {
  const { network, visualStyle, nodeTable, edgeTable, networkView } = data

  if (networkView !== undefined) {
    return updateNetworkView(
      network,
      networkView,
      visualStyle,
      nodeTable,
      edgeTable,
    )
  } else {
    return createNewNetworkView(network, visualStyle, nodeTable, edgeTable)
  }
}

export const nodeVisualProperties = (
  visualStyle: VisualStyle,
): Array<VisualProperty<VisualPropertyValueType>> => {
  return Object.values(visualStyle)
    .filter((value) => value.group === VisualPropertyGroup.Node)
    .sort(sortByDisplayName)
}

export const edgeVisualProperties = (
  visualStyle: VisualStyle,
): Array<VisualProperty<VisualPropertyValueType>> => {
  return Object.values(visualStyle)
    .filter((value) => value.group === VisualPropertyGroup.Edge)
    .sort(sortByDisplayName)
}

export const networkVisualProperties = (
  visualStyle: VisualStyle,
): Array<VisualProperty<VisualPropertyValueType>> => {
  return Object.values(visualStyle)
    .filter((value) => value.group === VisualPropertyGroup.Network)
    .sort(sortByDisplayName)
}

export const createVisualStyle = (): VisualStyle => {
  // create new copy of the default style instead of returning the same instance
  return getDefaultVisualStyle()
}

// NOTE: createVisualStyleFromCx and createVisualStyleOptionsFromCx have been moved to
// CxModel/impl/converters/visualStyleConverter.ts
// The functions have been removed from here to centralize CX2 conversion logic
