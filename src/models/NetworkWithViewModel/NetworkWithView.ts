import { Network, NetworkAttributes } from '../NetworkModel'
import { Table } from '../TableModel'
import { NetworkView } from '../ViewModel'
import { VisualStyle } from '../VisualStyleModel'
import { VisualStyleOptions } from '../VisualStyleModel/VisualStyleOptions'
import { OpaqueAspects } from '../OpaqueAspectModel'

/**
 * An utility interface to hold all the data needed to build a network view
 */
export interface NetworkWithView {
  network: Network
  networkAttributes?: NetworkAttributes
  nodeTable: Table
  edgeTable: Table
  visualStyle: VisualStyle
  networkViews: NetworkView[]
  visualStyleOptions?: VisualStyleOptions
  otherAspects?: OpaqueAspects[] // All other optional aspects found in the CX2 stream
}
