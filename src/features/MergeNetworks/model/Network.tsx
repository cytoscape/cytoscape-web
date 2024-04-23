import { Network } from '../../../models/NetworkModel/Network'
import { Table } from '../../../models/TableModel/Table'

export interface Identifiable {
    id: string;
}

export interface NetworktoMerge {
    network: Network
    nodeTable: Table;
    edgeTable: Table;
}

