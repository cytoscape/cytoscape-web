import { IdType } from "../../../models/IdType";
import { Column, Table } from "../../../models/TableModel";
import { MatchingTableRow } from "./DataInterfaceForMerge";

export interface MatchingTable {
    matchingTableRows: MatchingTableRow[]
    networkIds: Set<IdType>
    mergedAttributes: Column[]
}