import { IdType } from "../../../../models/IdType";
import { Column, Table } from "../../../../models/TableModel";
import { MatchingTableRow } from "../DataInterfaceForMerge";
import { ColumnType } from "../../utils/ColumnType";
import { common } from "@mui/material/colors";
import { has } from "lodash";

export class MatchingTable {
    private matchingTable: MatchingTableRow[]
    private networkIds: Set<IdType>
    private mergedAttributes: Column[]
    constructor(matchingTable: MatchingTableRow[]) {
        this.matchingTable = matchingTable
        this.networkIds = new Set()
        this.mergedAttributes = []
        matchingTable.forEach((row) => {
            const mergedCol = {
                name: row.mergedNetwork,
                type: row.type
            } as Column
            for (const key in row) {
                if (key !== 'id' && key !== 'mergedNetwork' && key !== 'type') {
                    this.networkIds.add(key)
                }
            }
            this.mergedAttributes.push(mergedCol)
        })


    }

    getMatchingTable() {
        return this.matchingTable
    }

    getMergedAttributes() {
        return this.mergedAttributes
    }

    getReversedAttributeMapping(netId: IdType, isNode: boolean = true): Map<string, Column> {
        const attMap = new Map()
        if (this.matchingTable.length > 0) {
            for (const row of (isNode ? this.matchingTable.slice(1) : this.matchingTable)) {
                if (row.hasOwnProperty(netId)) {
                    attMap.set(row[netId], { name: row.mergedNetwork, type: row.type } as Column)
                }
            }
        }
        return attMap
    }

    getAttributeMapping(netId: IdType, isNode: boolean = true): Map<string, Column> {
        const attMap = new Map()
        if (this.matchingTable.length > 0) {
            for (const row of (isNode ? this.matchingTable.slice(1) : this.matchingTable)) {
                if (row.hasOwnProperty(netId) && row[netId] !== 'None') {
                    attMap.set(row.mergedNetwork, { name: row[netId], type: row.type } as Column)
                }
            }
        }
        return attMap
    }

    getReversedMergedAttMap(): Map<string, string> {
        const attMap = new Map()
        if (this.matchingTable.length > 0) {
            for (const key in this.matchingTable[0]) {
                if (key !== 'id' && key !== 'mergedNetwork' && key !== 'type') {
                    attMap.set(key, this.matchingTable[0][key])
                }
            }
        }
        return attMap
    }

    setAttribute(rowId: number, netId: IdType, attName: string) {
        const row = this.matchingTable.find(r => r.id === rowId);
        if (row && row.hasOwnProperty(netId)) {
            row[netId] = attName
        }
    }

    setMergedNetwork(rowId: number, attName: string) {
        const row = this.matchingTable.find(r => r.id === rowId);
        if (row) {
            row.mergedNetwork = attName
        }
    }

    addMatchingTableRow(row: MatchingTableRow) {
        this.matchingTable.push(row)
        this.mergedAttributes.push({
            name: row.mergedNetwork,
            type: row.type
        } as Column)
    }

    addNetwork(netId: IdType, cols: Column[]) {
        this.checkConsistency()
        const commonCols = []
        for (let i = 0; i < this.matchingTable.length; i++) {
            let hasCommon = false
            for (const col of cols) {
                if (col.name === this.mergedAttributes[i].name) {
                    this.matchingTable[i][netId] = col.name
                }
                commonCols.push(col.name)
                hasCommon = true
                continue
            }
            if (!hasCommon) {
                this.matchingTable[i][netId] = 'None'
            }

        }
        const matchCols: Record<string, string> = {};
        for (const netId of this.networkIds) {
            matchCols[netId] = 'None'
        }
        for (const col of cols) {
            if (commonCols.indexOf(col.name) === -1) {
                this.matchingTable.push({
                    ...matchCols,
                    id: this.matchingTable.length,
                    [netId]: col.name,
                    mergedNetwork: col.name,
                    type: col.type
                } as MatchingTableRow)
            }
            this.mergedAttributes.push({
                name: col.name,
                type: col.type
            } as Column)
        }
        this.networkIds.add(netId)


    }
    removeNetwork(netId: IdType) {
        this.checkConsistency()
        if (this.networkIds.has(netId)) {
            this.networkIds.delete(netId)
        }
        for (let i = 0; i < this.matchingTable.length; i++) {
            delete this.matchingTable[i][netId]
        }
        const filteredIdx = new Set<number>();
        this.matchingTable = this.matchingTable.filter((row, index) => {
            delete row[netId];
            if (Object.keys(row).length > 3) {
                filteredIdx.add(index);
                return true;
            }
            return false;
        });
        this.mergedAttributes = this.mergedAttributes.filter((_, index) => filteredIdx.has(index));
    }
    checkConsistency() {
        if (this.mergedAttributes.length !== this.matchingTable.length) {
            throw new Error('Data inconsistency: mergedAttributes and matchingTable have different length.')
        }
    }


}