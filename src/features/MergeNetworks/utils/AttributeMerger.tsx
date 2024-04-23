import { Column } from '../../../models/TableModel/Column'
import { Network } from '../../../models/NetworkModel/Network'

export interface AttributeMerger {
    mergeAttribute(sourceAttributes: Map<Node, Column>, targetNode: Node, targetAttr: Column, network: Network): void;
}