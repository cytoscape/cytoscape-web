import { IdType } from "../../../models/IdType";
import { Column, Table, ValueType, ValueTypeName } from "../../../models/TableModel";

export interface MatchingTableRow {
    id: number;
    numConflicts: number;
    mergedNetwork: string;
    type: ValueTypeName | 'None';
    typeRecord: Record<string, ValueTypeName>;
    nameRecord: Record<string, string>;
}

export interface MatchingTable {
    matchingTableRows: MatchingTableRow[]
    networkIds: Set<IdType>
    mergedAttributes: Column[]
}