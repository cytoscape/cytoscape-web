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
        for (const key in row.nameRecord) {
            networkIds.add(key)
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
            if (row.nameRecord.hasOwnProperty(netId)) {
                attMap.set(row.nameRecord[netId], { name: row.mergedNetwork, type: row.type } as Column)
            }
        }
    }
    return attMap
}

export function getAttributeMapping(matchingTable: MatchingTable, netId: IdType, isNode: boolean = true): Map<number, Column> {
    const attMap = new Map()
    if (matchingTable.matchingTableRows.length > 0) {
        for (const row of (isNode ? matchingTable.matchingTableRows.slice(1) : matchingTable.matchingTableRows)) {
            if (row.nameRecord.hasOwnProperty(netId) && row.nameRecord[netId] !== 'None') {
                attMap.set(row.id, { name: row.nameRecord[netId], type: row.type } as Column)
            }
        }
    }
    return attMap
}

export function getReversedMergedAttMap(matchingTable: MatchingTable): Map<string, string> {
    const attMap = new Map()
    if (matchingTable.matchingTableRows.length > 0) {
        for (const key in matchingTable.matchingTableRows[0].nameRecord) {
            attMap.set(key, matchingTable.matchingTableRows[0].nameRecord[key])
        }
    }
    return attMap
}