import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { IdType } from '../../../models/IdType';
import { Column, ValueTypeName } from '../../../models/TableModel';
import { MatchingTableRow } from '../models/MatchingTable';
import { filterRows, getMergedType } from '../utils/helper-functions';
import { NetworkRecord } from '../models/DataInterfaceForMerge';
import { getResonableCompatibleConvertionType } from '../utils/attributes-operations';
import { generateUniqueName } from '../../../utils/network-utils';

interface NetMatchingTableState {
    rows: MatchingTableRow[];
    networkIds: Set<IdType>;
}

interface NetMatchingTableActions {
    setAllRows: (newRows: MatchingTableRow[]) => void;
    setRow: (rowIndex: number, updatedRow: MatchingTableRow) => void;
    addRow: (newRow: MatchingTableRow) => void
    resetStore: () => void;
    addNetworksToTable: (networkIds: IdType[], networkRecords: Record<IdType, NetworkRecord>, matchingCols: Record<string, Column>) => void
    removeNetworksFromTable: (networkIds: IdType[]) => void
}

type NetMatchingTableStore = NetMatchingTableState & NetMatchingTableActions

const addNetworks = (state: NetMatchingTableStore, networkIds: IdType[], networkRecords: Record<IdType, NetworkRecord>, matchingCols: Record<string, Column>) => {
    const sharedColsRecord: Record<IdType, Set<string>> = {};
    networkIds.forEach(netId => sharedColsRecord[netId] = new Set());
    const mergedNetworkNames = new Set(state.rows.map(row => row.mergedNetwork));
    state.rows = state.rows.map((row, id) => {
        let typeCheck = false;
        for (const netId of networkIds) {
            const netCols = networkRecords[netId].netTable?.columns;
            if (netCols?.some(nc => nc.name === row.mergedNetwork)) {
                row.nameRecord[netId] = row.mergedNetwork;
                //Todo: whether it is necessary to throw error here since the type should not be none in this case
                row.typeRecord[netId] = netCols.find(nc => nc.name === row.mergedNetwork)?.type || 'None';
                typeCheck = true;
                sharedColsRecord[netId].add(row.mergedNetwork);
            } else {
                row.nameRecord[netId] = 'None';
                row.typeRecord[netId] = 'None';
            }
        }
        if (typeCheck) {
            const { hasConflicts, mergedType } = getMergedType(row.typeRecord);
            row.hasConflicts = hasConflicts;
            row.type = mergedType;
        }
        return row;
    });

    const originalNetworkIds = Array.from(state.networkIds);
    networkIds.forEach((net1, index1) => {
        state.networkIds.add(net1);
        networkRecords[net1]?.netTable?.columns.forEach(col => {
            if (!sharedColsRecord[net1]?.has(col.name)) {
                const matchCols: Record<string, string> = {};
                const typeRecord: Record<string, ValueTypeName | 'None'> = {};
                matchCols[net1] = col.name;
                const typeSet = new Set<ValueTypeName>();
                typeSet.add(col.type);
                typeRecord[net1] = col.type;
                (originalNetworkIds.concat(networkIds.slice(0, index1) ?? [])).forEach(net => {
                    matchCols[net] = 'None';
                    typeRecord[net] = 'None';
                });
                networkIds.slice(index1 + 1).forEach(net2 => {
                    if (networkRecords[net2]?.netTable?.columns.some(nc => nc.name === col.name)) {
                        const newSharedCols = new Set(sharedColsRecord[net2]);
                        newSharedCols.add(col.name);
                        sharedColsRecord[net2] = newSharedCols;
                        matchCols[net2] = col.name;
                        const colType = networkRecords[net2]?.netTable?.columns.find(nc => nc.name === col.name)?.type;
                        if (colType !== undefined) {
                            typeSet.add(colType);
                            typeRecord[net2] = colType;
                        }
                    } else {
                        matchCols[net2] = 'None';
                        typeRecord[net2] = 'None';
                    }
                });
                const mergedNetworkName = generateUniqueName(mergedNetworkNames, col.name);
                mergedNetworkNames.add(mergedNetworkName);
                state.rows.push({
                    id: state.rows.length,
                    mergedNetwork: mergedNetworkName,
                    type: getResonableCompatibleConvertionType(typeSet),
                    typeRecord: typeRecord,
                    nameRecord: matchCols,
                    hasConflicts: typeSet.size > 1
                });
            }
        });
    });
}

const removeNetworks = (state: NetMatchingTableStore, networkIds: IdType[]) => {
    for (const tableRow of state.rows) {
        let needRecheck = false;
        for (const netId of networkIds) {
            if (tableRow.nameRecord.hasOwnProperty(netId) || tableRow.typeRecord.hasOwnProperty(netId)) {
                delete tableRow.nameRecord[netId];
                delete tableRow.typeRecord[netId];
                needRecheck = true;
            }
        }
        if (needRecheck) {
            const { hasConflicts, mergedType } = getMergedType(tableRow.typeRecord);
            tableRow.hasConflicts = hasConflicts;
            tableRow.type = mergedType;
        }
    }
    networkIds.forEach(netId => state.networkIds.delete(netId));
    state.rows = filterRows(state.rows);
}

const useNetMatchingTableStore = create(immer<NetMatchingTableStore>((set) => ({
    rows: [],
    networkIds: new Set(),
    setAllRows: (newRows) => set((state) => {
        state.rows = filterRows(newRows)
    }),
    setRow: (rowIndex, updatedRow) => set((state) => {
        if (rowIndex < 0 || rowIndex >= state.rows.length) return;
        state.rows[rowIndex] = updatedRow;
        state.rows = filterRows(state.rows);
    }),
    addRow: (newRow) => set((state) => {
        state.rows.push(newRow);
    }),
    resetStore: () => set(() => ({
        rows: [],
        networkIds: new Set(),
    })),
    addNetworksToTable: (networkIds, networkRecords, matchingCols) => set(state => { addNetworks(state, networkIds, networkRecords, matchingCols) }),
    removeNetworksFromTable: (networkIds) => set(state => { removeNetworks(state, networkIds) })
})));

export default useNetMatchingTableStore;