import { IdType } from "../../../models/IdType";
import { Column, Table, ValueType } from "../../../models/TableModel";

export interface MatchingTableRow {
    id: number;
    mergedNetwork: string;
    type: string;
    [key: IdType]: string | number;
}

export interface MatchingTable {
    matchingTableRows: MatchingTableRow[]
    networkIds: Set<IdType>
    mergedAttributes: Column[]
}