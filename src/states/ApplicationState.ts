import { Network } from '../models/network'
import { NetworkView } from '../models/NetworkView'
import { Table } from '../models/Table'
import { VisualStyle } from '../models/Style'

export interface ApplicationState {
  network: Network | null
  networkAttributes: Table // Maybe a custom generic object type?
  nodeTable: Table
  edgeTable: Table
  networkView: NetworkView | null
  visualStyle: VisualStyle | null

  appDispatch: any
}
