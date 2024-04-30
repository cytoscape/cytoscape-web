import { IdType } from "../../../../models/IdType";
import { Column, Table } from "../../../../models/TableModel";
import { MatchingTableRow } from "../DataInterfaceForMerge";
import { ColumnType } from "../../utils/ColumnType";

export class MatchingTable {
    private matchingTable: MatchingTableRow[]
    private mergedAttributes: Column[]

    constructor(matchingTable: MatchingTableRow[]) {
        this.matchingTable = matchingTable
        this.mergedAttributes = matchingTable.map((row) => {
            return {
                name: row.mergedNetwork,
                type: row.type
            } as Column
        })


    }

    getMatchingTable() {
        return this.matchingTable
    }
    getMergedAttributes() {
        return this.mergedAttributes
    }

}