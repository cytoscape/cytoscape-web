import { Table } from 'dexie'
import { Cx2 } from '../../utils/cx/Cx2'
import { Network } from '../NetworkModel'
import { NetworkView } from '../ViewModel'
import { VisualProperty } from './VisualProperty'
import { VisualPropertyValueType } from './VisualPropertyValue'
import { VisualStyle } from './VisualStyle'

export interface VisualStyleFn {
  // Create an empty VisualStyle
  createVisualStyle: () => VisualStyle

  // Create a VisualStyle from a Cx2 object
  createVisualStyleFromCx: (cx: Cx2) => VisualStyle

  /**
   * Compute the view model for the given network from the
   * visual style and network data tables
   *
   * @param network
   * @param nodeTable
   * @param edgeTable
   * @param visualStyle
   *
   * @returns NetworkView
   */
  applyVisualStyle: (
    network: Network,
    nodeTable: Table,
    edgeTable: Table,
    visualStyle: VisualStyle,
  ) => NetworkView

  nodeVisualProperties: (
    visualStyle: VisualStyle,
  ) => Array<VisualProperty<VisualPropertyValueType>>

  edgeVisualProperties: (
    visualStyle: VisualStyle,
  ) => Array<VisualProperty<VisualPropertyValueType>>

  networkVisualProperties: (
    visualStyle: VisualStyle,
  ) => Array<VisualProperty<VisualPropertyValueType>>
}
