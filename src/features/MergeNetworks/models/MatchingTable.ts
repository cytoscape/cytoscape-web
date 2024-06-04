import { IdType } from "../../../models/IdType";
import { Column, Table, ValueType, ValueTypeName } from "../../../models/TableModel";

export interface MatchingTableRow {
    id: number;
    hasConflicts: boolean;
    mergedNetwork: string;
    type: ValueTypeName | 'None';
    typeRecord: Record<string, ValueTypeName | 'None'>;
    nameRecord: Record<string, string>;
}

export interface MatchingTable {
    matchingTableRows: MatchingTableRow[]
    networkIds: Set<IdType>
    mergedAttributes: Column[]
}