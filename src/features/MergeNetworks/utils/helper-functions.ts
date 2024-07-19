import { IdType } from "../../../models/IdType";
import { NdexNetworkSummary } from "../../../models/NetworkSummaryModel";
import { Column, Table, ValueType, ValueTypeName } from "../../../models/TableModel";
import { createTable, insertRows } from "../../../models/TableModel/impl/InMemoryTable";
import { NetworkRecord, Pair } from "../models/DataInterfaceForMerge";
import { MatchingTableRow } from "../models/MatchingTable";
import { getResonableCompatibleConvertionType } from "./attributes-operations";

// Utility function to find index of a pair in a list
export const findPairIndex = (pairs: Pair<string, string>[], uuid: string) => {
    return pairs.findIndex(pair => pair[1] === uuid);
};

// Function to find and remove the pair
export const removePair = (list: Pair<string, string>[], target: string): Pair<string, string> | undefined => {
    const index = list.findIndex((pair) => pair[0] === target);
    if (index !== -1) {
        return list.splice(index, 1)[0];  // Remove the item and return it
    }
    return undefined;  // Return undefined if no item was found
};

export const getNetTableFromSummary = (summary: NdexNetworkSummary): Table => {
    const id = summary.externalId;
    const cols: Column[] = [];
    const tableRows: Array<[IdType, Record<string, ValueType>]> = [
        ['0', { name: summary.name }],
        ['1', { version: summary.version }],
        ['2', { description: summary.description }]
    ];

    summary.properties.forEach((property) => {
        cols.push({ name: property.predicateString, type: property.dataType } as Column);
        tableRows.push([`${tableRows.length}`, { [property.predicateString]: property.value }]);
    });

    const tableColumns = [
        { name: 'name', type: 'string' } as Column,
        { name: 'version', type: 'string' } as Column,
        { name: 'description', type: 'string' } as Column,
        ...cols
    ];

    const netTable = createTable(id, tableColumns);
    insertRows(netTable, tableRows);
    return netTable;
};

export function isStringArray(value: any): value is string[] {
    return Array.isArray(value) && value.every(item => typeof item === 'string');
}

export function isNumberArray(value: any): value is number[] {
    return Array.isArray(value) && value.every(item => typeof item === 'number');
}

export function isBooleanArray(value: any): value is boolean[] {
    return Array.isArray(value) && value.every(item => typeof item === 'boolean');
}

export function filterRows(rows: MatchingTableRow[]) {
    return rows.filter(row => {
        const allNone = Object.keys(row.nameRecord).every(key => row.nameRecord[key] === 'None');
        return !allNone;
    });
};

export function getMergedType(typeRecord: Record<string, ValueTypeName | 'None'>) {
    const typeSet: Set<ValueTypeName> = new Set();
    for (const colType of Object.values(typeRecord)) {
        if (colType !== 'None') typeSet.add(colType);
    }
    return {
        hasConflicts: typeSet.size > 1,
        mergedType: getResonableCompatibleConvertionType(typeSet)
    }
}

export function sortListAlphabetically(list: [string, IdType][]): [string, IdType][] {
    return list.sort((a, b) => {
        const nameA = a[0].toLowerCase();
        const nameB = b[0].toLowerCase();
        if (nameA < nameB) {
            return -1;
        }
        if (nameA > nameB) {
            return 1;
        }
        return 0;
    });
}