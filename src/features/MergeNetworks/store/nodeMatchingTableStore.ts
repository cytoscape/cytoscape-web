import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { IdType } from '../../../models/IdType';
import { Column, ValueTypeName } from '../../../models/TableModel';
import { MatchingTableRow } from '../models/MatchingTable';
import { filterRows } from '../utils/helper-functions';
import { NetworkRecord } from '../models/DataInterfaceForMerge';
import { getResonableCompatibleConvertionType } from '../utils/attributes-operations';

interface NodeMatchingTableState {
    rows: MatchingTableRow[];
    networkIds: Set<IdType>;
}

interface NodeMatchingTableActions {
    setAllRows: (newRows: MatchingTableRow[]) => void;
    setRow: (rowIndex: number, updatedRow: MatchingTableRow) => void;
    addRow: (newRow: MatchingTableRow) => void
    updateRow: (rowIndex: number, netId: string, col: Column) => void;
    addNetworkToTable: (networkId: IdType, netRecord: NetworkRecord, matchingCol: Column) => void
    addNetworksToTable: (networkIds: IdType[], networkRecords: Record<IdType, NetworkRecord>, matchingCols: Record<string, Column>) => void
}

type MatchingTableStore = NodeMatchingTableState & NodeMatchingTableActions

const addNetwork = (state: MatchingTableStore, networkId: IdType, netRecord: NetworkRecord, matchingCol: Column) => {
    const netCols = netRecord.nodeTable.columns;
    const sharedCols = new Set<string>();
    if (state.rows.length > 0) {
        state.rows = state.rows.map((row, id) => {
            let typeCheck = true
            if (id === 0) {
                row.nameRecord[networkId] = matchingCol.name || 'None';
                row.typeRecord[networkId] = matchingCol.type || 'None';
            }
            else {
                if (netCols.some(nc => nc.name === row.mergedNetwork)) {
                    sharedCols.add(row.mergedNetwork);
                    row.nameRecord[networkId] = row.mergedNetwork;
                    row.typeRecord[networkId] = netCols.find(nc => nc.name === row.mergedNetwork)?.type || 'None';
                } else {
                    row.nameRecord[networkId] = 'None';
                    row.typeRecord[networkId] = 'None';
                    typeCheck = false;
                }
            }
            if (typeCheck) {
                const typeSet: Set<ValueTypeName> = new Set();
                for (const colType of Object.values(row.typeRecord)) {
                    if (colType !== 'None') typeSet.add(colType);
                }
                row.hasConflicts = typeSet.size > 1;
                row.type = getResonableCompatibleConvertionType(typeSet);
            }
            return row;
        });
    } else {
        state.rows.push({
            id: 0,
            mergedNetwork: 'Matching.Attribute',
            type: matchingCol.type || 'None',
            nameRecord: { [networkId]: matchingCol.name || 'None' },
            typeRecord: { [networkId]: matchingCol.type || 'None' },
            hasConflicts: false
        });
    }

    // Add new rows for columns not in sharedCols
    netCols.forEach(col => {
        if (!sharedCols.has(col.name)) {
            state.rows.push({
                id: state.rows.length,
                mergedNetwork: col.name,
                type: col.type,
                nameRecord: { ...Array.from(state.networkIds).reduce((acc, key) => ({ ...acc, [key]: 'None' }), {}), [networkId]: col.name },
                typeRecord: { ...Array.from(state.networkIds).reduce((acc, key) => ({ ...acc, [key]: 'None' }), {}), [networkId]: col.type },
                hasConflicts: false
            });
        }
    });
    // Update network IDs
    state.networkIds.add(networkId);
};

const addNetworks = (state: MatchingTableStore, networkIds: IdType[], networkRecords: Record<IdType, NetworkRecord>, matchingCols: Record<string, Column>) => {
    const sharedColsRecord: Record<IdType, Set<string>> = {};

    if (state.rows.length > 0) {
        state.rows = state.rows.map((row, id) => {
            let typeCheck = false;
            if (id === 0) {
                for (const netId in networkIds) {
                    row.nameRecord[netId] = matchingCols[netId]?.name || 'None';
                    row.typeRecord[netId] = matchingCols[netId]?.type || 'None';
                    typeCheck = true;
                }
            } else {
                for (const netId in networkIds) {
                    const netCols = networkRecords[netId].nodeTable.columns;
                    if (netCols.some(nc => nc.name === row.mergedNetwork)) {
                        row.nameRecord[netId] = row.mergedNetwork;
                        row.typeRecord[netId] = netCols.find(nc => nc.name === row.mergedNetwork)?.type || 'None';
                        typeCheck = true;
                        sharedColsRecord[netId].add(row.mergedNetwork);
                        row.nameRecord[netId] = 'None';
                        row.typeRecord[netId] = 'None';
                    }
                }
            }
            if (typeCheck) {
                const typeSet: Set<ValueTypeName> = new Set();
                for (const colType of Object.values(row.typeRecord)) {
                    if (colType !== 'None') typeSet.add(colType);
                }
                row.hasConflicts = typeSet.size > 1;
                row.type = getResonableCompatibleConvertionType(typeSet);
            }
            return row;
        });
    } else {
        const matchingColRow: MatchingTableRow = {
            id: 0,
            mergedNetwork: 'Matching.Attribute',
            type: 'None',
            nameRecord: {},
            typeRecord: {},
            hasConflicts: false
        };
        const typeSet: Set<ValueTypeName> = new Set();
        for (const netId in networkIds) {
            matchingColRow.nameRecord[netId] = matchingCols[netId]?.name || 'None';
            const colType = (matchingCols[netId]?.type as ValueTypeName | 'None') || 'None';
            matchingColRow.typeRecord[netId] = colType;
            if (colType !== 'None') typeSet.add(matchingCols[netId]?.type || 'None');
        }
        matchingColRow.hasConflicts = typeSet.size > 1;
        matchingColRow.type = getResonableCompatibleConvertionType(typeSet);
        state.rows.push(matchingColRow);
    }
    networkIds.forEach((net1, index1) => {

    });
}

const removeNetwork = (state: MatchingTableStore, networkId: IdType, netRecord: NetworkRecord) => {

}

const useNodeMatchingTableStore = create(immer<MatchingTableStore>((set) => ({
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
    updateRow: (rowIndex, netId, col) => set((state) => {
        if (rowIndex < 0 || rowIndex >= state.rows.length) return;
        const row = state.rows[rowIndex];
        if (row.nameRecord.hasOwnProperty(netId) && row.typeRecord.hasOwnProperty(netId)) {
            row.nameRecord[netId] = col.name;
            row.typeRecord[netId] = col.type;
            const typeSet: Set<ValueTypeName> = new Set();
            for (const colType of Object.values(row.typeRecord)) {
                if (colType !== 'None') typeSet.add(colType);
            }
            row.hasConflicts = typeSet.size > 1;
            row.type = getResonableCompatibleConvertionType(typeSet);
        }
    }),
    addNetworkToTable: (networkId, netRecord, matchingCol) => set(state => { addNetwork(state, networkId, netRecord, matchingCol) }),
    addNetworksToTable: (networkIds, networkRecords, matchingCols) => set(state => { addNetworks(state, networkIds, networkRecords, matchingCols) }),
})));

export default useNodeMatchingTableStore;