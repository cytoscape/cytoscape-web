import { Cx2 } from '../../utils/cx/Cx2'
import { Network } from '../NetworkModel'
import { Table } from '../TableModel'
import { NetworkView } from '../ViewModel'
import { VisualProperty } from './VisualProperty'
import { VisualPropertyValueType } from './VisualPropertyValue'
import { VisualStyle } from './VisualStyle'

export interface NetworkViewSources {
  /**
   * Network data to be used to generate view model
   */
  network: Network

  /**
   * Optional network view if there is an existing one
   */
  networkView?: NetworkView
  nodeTable: Table
  edgeTable: Table
  visualStyle: VisualStyle
}

export interface VisualStyleFn {
  // Create an empty VisualStyle
  createVisualStyle: () => VisualStyle

  // Create a VisualStyle from a Cx2 object
  createVisualStyleFromCx: (cx: Cx2) => VisualStyle

  /**
   * Compute the view model for the given network from the
   * visual style and network data tables
   *
   * @param data All data objects required to create
   *
   * @returns NetworkView
   */
  applyVisualStyle: (data: NetworkViewSources) => NetworkView

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
