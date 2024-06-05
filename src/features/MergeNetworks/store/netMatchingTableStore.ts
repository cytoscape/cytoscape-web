import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { IdType } from '../../../models/IdType';
import { Column, ValueTypeName } from '../../../models/TableModel';
import { MatchingTableRow } from '../models/MatchingTable';
import { filterRows } from '../utils/helper-functions';
import { NetworkRecord } from '../models/DataInterfaceForMerge';
import { getResonableCompatibleConvertionType } from '../utils/attributes-operations';

interface MatchingTableState {
    rows: MatchingTableRow[];
    networkIds: Set<IdType>;
}

interface MatchingTableActions {
    setAllRows: (newRows: MatchingTableRow[]) => void;
    setRow: (rowIndex: number, updatedRow: MatchingTableRow) => void;
    addRow: (newRow: MatchingTableRow) => void
    addNetworkToTable: (networkId: IdType, netRecord: NetworkRecord) => void
    addNetworksToTable: (networkIds: IdType[], networkRecords: Record<IdType, NetworkRecord>) => void
}

type MatchingTableStore = MatchingTableState & MatchingTableActions
const addNetwork = (state: MatchingTableStore, networkId: IdType, netRecord: NetworkRecord) => {
    const netCols = netRecord.netTable?.columns || [];
    const sharedCols = new Set<string>();
    state.rows = state.rows.map((row, id) => {
        if (!row.nameRecord.hasOwnProperty(networkId)) {
            if (netCols.some(nc => nc.name === row.mergedNetwork)) {
                sharedCols.add(row.mergedNetwork);
                row.nameRecord[networkId] = row.mergedNetwork;
                row.typeRecord[networkId] = netCols.find(nc => nc.name === row.mergedNetwork)?.type || 'None';
                const typeSet: Set<ValueTypeName> = new Set();
                for (const colType of Object.values(row.typeRecord)) {
                    if (colType !== 'None') typeSet.add(colType);
                }
                row.hasConflicts = typeSet.size > 1;
                row.type = getResonableCompatibleConvertionType(typeSet);
            } else {
                row.nameRecord[networkId] = 'None';
                row.typeRecord[networkId] = 'None';
            }
        }
        return row;
    });

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
const useNetMatchingTableStore = create(immer<MatchingTableStore>((set) => ({
    rows: [],
    networkIds: new Set(),
    setAllRows: (newRows) => set((state) => ({
        rows: filterRows(newRows)
    })),
    setRow: (rowIndex, updatedRow) => set((state) => ({
        rows: filterRows(state.rows),
    })),
    addRow: (newRow) => set((state) => ({
        rows: [...state.rows, newRow],
    })),
    addNetworkToTable: (networkId, netRecord) => set(state => addNetwork(state, networkId, netRecord)),
    addNetworksToTable: (networkIds, networkRecords) => set(state => {
        networkIds.forEach(networkId => {
            if (networkRecords[networkId]) {
                addNetwork(state, networkId, networkRecords[networkId]);
            }
        });
    }),
})));

export default useNetMatchingTableStore;