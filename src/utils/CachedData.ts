import { Network } from '../models/NetworkModel'
import { Table } from '../models/TableModel'
import { NetworkView } from '../models/ViewModel'
import { VisualStyle } from '../models/VisualStyleModel'

export interface CachedData {
  network?: Network
  nodeTable?: Table
  edgeTable?: Table
  visualStyle?: VisualStyle
  networkViews?: NetworkView[]
}
