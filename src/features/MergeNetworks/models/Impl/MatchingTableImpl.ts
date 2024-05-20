import { IdType } from "../../../../models/IdType";
import { Column, Table } from "../../../../models/TableModel";
import { MatchingTable, MatchingTableRow } from '../MatchingTable'

export function createMatchingTable(matchingTableRows: MatchingTableRow[]): MatchingTable {
    const mergedAttributes: Column[] = []
    const networkIds: Set<IdType> = new Set()
    matchingTableRows.forEach((row) => {
        const mergedCol = {
            name: row.mergedNetwork,
            type: row.type
        } as Column
        for (const key in row) {
            if (key !== 'id' && key !== 'mergedNetwork' && key !== 'type' && key !== 'numConflicts') {
                networkIds.add(key)
            }
        }
        mergedAttributes.push(mergedCol)
    })
    return {
        matchingTableRows: matchingTableRows,
        networkIds: networkIds,
        mergedAttributes: mergedAttributes
    }
}

export function getMatchingTableRows(matchingTable: MatchingTable): MatchingTableRow[] {
    return matchingTable.matchingTableRows
}

export function getMergedAttributes(matchingTable: MatchingTable): Column[] {
    return matchingTable.mergedAttributes
}

export function getReversedAttributeMapping(matchingTable: MatchingTable, netId: IdType, isNode: boolean = true): Map<string, Column> {
    const attMap = new Map()
    if (matchingTable.matchingTableRows.length > 0) {
        for (const row of (isNode ? matchingTable.matchingTableRows.slice(1) : matchingTable.matchingTableRows)) {
            if (row.hasOwnProperty(netId)) {
                attMap.set(row[netId], { name: row.mergedNetwork, type: row.type } as Column)
            }
        }
    }
    return attMap
}

export function getAttributeMapping(matchingTable: MatchingTable, netId: IdType, isNode: boolean = true): Map<number, Column> {
    const attMap = new Map()
    if (matchingTable.matchingTableRows.length > 0) {
        for (const row of (isNode ? matchingTable.matchingTableRows.slice(1) : matchingTable.matchingTableRows)) {
            if (row.hasOwnProperty(netId) && row[netId] !== 'None') {
                attMap.set(row.id, { name: row[netId], type: row.type } as Column)
            }
        }
    }
    return attMap
}

export function getReversedMergedAttMap(matchingTable: MatchingTable): Map<string, string> {
    const attMap = new Map()
    if (matchingTable.matchingTableRows.length > 0) {
        for (const key in matchingTable.matchingTableRows[0]) {
            if (key !== 'id' && key !== 'mergedNetwork' && key !== 'type' && key !== 'numConflicts') {
                attMap.set(key, matchingTable.matchingTableRows[0][key])
            }
        }
        if (attMap.size !== (Object.entries(matchingTable.matchingTableRows[0]).length - 3)) {
            throw new Error('Data inconsistency: networkIds and matchingTable have different length.')
        }
    }
    return attMap
}

export function setAttribute(matchingTable: MatchingTable, rowId: number, netId: IdType, attName: string) {
    const row = matchingTable.matchingTableRows.find(r => r.id === rowId);
    if (row && row.hasOwnProperty(netId)) {
        row[netId] = attName
    }
}

export function setMergedNetwork(matchingTable: MatchingTable, rowId: number, attName: string) {
    const row = matchingTable.matchingTableRows.find(r => r.id === rowId);
    if (row) {
        row.mergedNetwork = attName
    }
}

export function addMatchingTableRow(matchingTable: MatchingTable, row: MatchingTableRow) {
    matchingTable.matchingTableRows.push(row)
    matchingTable.mergedAttributes.push({
        name: row.mergedNetwork,
        type: row.type
    } as Column)
}

export function addNetwork(matchingTable: MatchingTable, netId: IdType, cols: Column[]) {
    checkConsistency(matchingTable)
    const commonCols = []
    for (let i = 0; i < matchingTable.matchingTableRows.length; i++) {
        let hasCommon = false
        for (const col of cols) {
            if (col.name === matchingTable.mergedAttributes[i].name) {
                matchingTable.matchingTableRows[i][netId] = col.name
            }
            commonCols.push(col.name)
            hasCommon = true
            continue
        }
        if (!hasCommon) {
            matchingTable.matchingTableRows[i][netId] = 'None'
        }

    }
    const matchCols: Record<string, string> = {};
    for (const netId of matchingTable.networkIds) {
        matchCols[netId] = 'None'
    }
    for (const col of cols) {
        if (commonCols.indexOf(col.name) === -1) {
            matchingTable.matchingTableRows.push({
                ...matchCols,
                id: matchingTable.matchingTableRows.length,
                [netId]: col.name,
                mergedNetwork: col.name,
                type: col.type
            } as MatchingTableRow)
        }
        matchingTable.mergedAttributes.push({
            name: col.name,
            type: col.type
        } as Column)
    }
    matchingTable.networkIds.add(netId)
}

export function removeNetwork(matchingTable: MatchingTable, netId: IdType) {
    checkConsistency(matchingTable)
    if (matchingTable.networkIds.has(netId)) {
        matchingTable.networkIds.delete(netId)
    }
    for (let i = 0; i < matchingTable.matchingTableRows.length; i++) {
        delete matchingTable.matchingTableRows[i][netId]
    }
    const filteredIdx = new Set<number>();
    matchingTable.matchingTableRows = matchingTable.matchingTableRows.filter((row, index) => {
        delete row[netId];
        if (Object.keys(row).length > 3) {
            filteredIdx.add(index);
            return true;
        }
        return false;
    });
    matchingTable.mergedAttributes = matchingTable.mergedAttributes.filter((_, index) => filteredIdx.has(index));
}

export function checkConsistency(matchingTable: MatchingTable) {
    if (matchingTable.mergedAttributes.length !== matchingTable.matchingTableRows.length) {
        throw new Error('Data inconsistency: mergedAttributes and matchingTable have different length.')
    }
}
