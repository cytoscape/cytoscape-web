import { Network } from '../models/Network'
import { NetworkView } from '../models/NetworkView'
import { Table } from '../models/Table'
import { VisualStyle } from '../models/VisualMapping/VisualStyle'

export interface ApplicationState {
  network: Network | null
  networkAttributes: Table // Maybe a custom generic object type?
  nodeTable: Table
  edgeTable: Table
  networkView: NetworkView | null
  visualStyle: VisualStyle | null
}
