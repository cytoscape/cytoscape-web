import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { IdType } from '../../../models/IdType';
import { Column } from '../../../models/TableModel';
import { MatchingTableRow } from '../models/MatchingTable';
import { filterRows } from '../utils/helper-functions';

interface MatchingTableState {
    rows: MatchingTableRow[];
}

interface MatchingTableActions {
    setAllRows: (newRows: MatchingTableRow[]) => void
    setRow: (rowIndex: number, updatedRow: MatchingTableRow) => void;
    addRow: (newRow: MatchingTableRow) => void
}

type MatchingTableStore = MatchingTableState & MatchingTableActions

const useNodeMatchingTableStore = create<MatchingTableStore>((set) => ({
    rows: [],
    setAllRows: (newRows) => set((state) => ({
        rows: filterRows(newRows)
    })),
    setRow: (rowIndex, updatedRow) => set((state) => {
        if (rowIndex >= 0 && rowIndex < state.rows.length) {
            state.rows[rowIndex] = updatedRow;
        }
        return { rows: filterRows(state.rows) };
    }),
    addRow: (newRow) => set((state) => ({
        rows: [...state.rows, newRow]
    })),
}));

export default useNodeMatchingTableStore;