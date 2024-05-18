import { IdType } from "../../../models/IdType";
import { NdexNetworkSummary } from "../../../models/NetworkSummaryModel";
import { Column, Table, ValueType } from "../../../models/TableModel";
import { createTable, insertRows } from "../../../models/TableModel/impl/InMemoryTable";
import { NetworkRecord, Pair } from "../models/DataInterfaceForMerge";
import { MatchingTableRow } from "../models/MatchingTable";

// Utility function to find index of a pair in a list
export const findPairIndex = (pairs: Pair<string, string>[], uuid: string) => {
    return pairs.findIndex(pair => pair[1] === uuid);
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

export const processColumns = (
    tableName: 'nodeTable' | 'edgeTable' | 'netTable',
    toMergeNetworksList: Pair<string, string>[],
    networkRecords: Record<IdType, NetworkRecord>,
    initialTable?: MatchingTableRow[],
): MatchingTableRow[] => {
    const newTable: MatchingTableRow[] = initialTable ? [...initialTable] : [];
    const sharedColsRecord: Record<IdType, string[]> = {};
    toMergeNetworksList.forEach((net1, index1) => {
        networkRecords[net1[1]]?.[tableName]?.columns.forEach(col => {
            if (!sharedColsRecord[net1[1]]?.includes(col.name)) {
                const matchCols: Record<string, string> = {};
                matchCols[net1[1]] = col.name;

                toMergeNetworksList.slice(0, index1)?.forEach(net2 => {
                    matchCols[net2[1]] = 'None';
                });
                toMergeNetworksList.slice(index1 + 1).forEach(net2 => {
                    const network = networkRecords[net2[1]];
                    if (network?.[tableName]?.columns.some(nc => nc.name === col.name)) {
                        const newSharedCols = sharedColsRecord[net2[1]] ? [...sharedColsRecord[net2[1]]] : [];
                        newSharedCols.push(col.name);
                        sharedColsRecord[net2[1]] = newSharedCols;
                        matchCols[net2[1]] = col.name;
                    } else {
                        matchCols[net2[1]] = 'None';
                    }
                });

                newTable.push({
                    id: newTable.length,
                    ...matchCols,
                    mergedNetwork: col.name,
                    type: col.type,
                });
            }
        });
    });
    return newTable;
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