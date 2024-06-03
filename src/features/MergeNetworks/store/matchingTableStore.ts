import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { IdType } from '../../../models/IdType';
import { Column } from '../../../models/TableModel';


interface MatchingColsState {
    matchingCols: Record<string, Column>;
    setMatchingCols: (newMatchingCols: Record<string, Column>) => void;
}

const useMatchingColumnsStore = create<MatchingColsState>((set) => ({
    matchingCols: {},
    setMatchingCols: (newMatchingCols: Record<IdType, Column>) => set((state) => ({
        matchingCols: { ...state.matchingCols, ...newMatchingCols }
    }))
}));

export default useMatchingColumnsStore;