import { Network } from "../../../models/NetworkModel";
import { Table } from '../../../models/TableModel';
export enum MergeType {
    union = 'Union',
    intersection = 'Intersection',
    difference = 'Difference'
}

export interface NetworktoMerge {
    nodes: NodeToMerge[];
    edges: EdgeToMerge[];
}


export interface NodeToMerge {
    id: number;
    attributes: Map<string, any>;
}

export interface EdgeToMerge {
    source: number;
    target: number;
    directed: boolean;
    attributes: Map<string, any>;
}

export interface NetworkRecord {
    network: Network;
    nodeTable: Table;
    edgeTable: Table;
}

export interface MatchingTableRow {
    mergedNetwork: string;
    type: string;
    id: number;
    [key: string]: string | number;
}