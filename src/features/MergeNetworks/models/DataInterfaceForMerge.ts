import { Network } from "../../../models/NetworkModel";
import { Table, ValueType } from '../../../models/TableModel';
export enum MergeType {
    union = 'Union',
    intersection = 'Intersection',
    difference = 'Difference'
}

export enum TableView {
    node = 'Node',
    edge = 'Edge',
    network = 'Network'
}

export type Pair<T1, T2> = [T1, T2];

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
    netTable?: Table;
}

export interface MatchingTableRow {
    mergedNetwork: string;
    type: string;
    id: number;
    [key: string]: ValueType;
}