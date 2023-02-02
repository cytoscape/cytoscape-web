import { Table } from 'dexie'
import { Cx2 } from '../../utils/cx/Cx2'
import { Network } from '../NetworkModel'
import { NetworkView } from '../ViewModel'
import { VisualStyle } from './VisualStyle'

export interface VisualStyleFn {
  createVisualStyle: () => VisualStyle
  createVisualStyleFromCx: (cx: Cx2) => VisualStyle

  applyVisualStyle: (
    network: Network,
    nodeTable: Table,
    edgeTable: Table,
    visualStyle: VisualStyle,
  ) => NetworkView

  // nodeVisualProperties: (
  //   visualStyle: VisualStyle,
  // ) => VisualProperty<VisualPropertyValueType>[]
  // edgeVisualProperties: (
  //   visualStyle: VisualStyle,
  // ) => VisualProperty<VisualPropertyValueType>[]
  // networkVisualProperties: (
  //   visualStyle: VisualStyle,
  // ) => VisualProperty<VisualPropertyValueType>[]
}
