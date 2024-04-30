import { IdType } from "../../../../models/IdType";
import { Column, Table } from "../../../../models/TableModel";
import { MatchingTableRow } from "../DataInterfaceForMerge";
import { ColumnType } from "../../utils/ColumnType";

export class MatchingTable {
    private matchingTable: MatchingTableRow[]
    private

    constructor(matchingTable: MatchingTableRow[]) {
        this.matchingTable = matchingTable
    }

    getMatchingTable() {
        return this.matchingTable
    }



}