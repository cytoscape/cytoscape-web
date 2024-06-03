import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { IdType } from '../../../models/IdType';
import { Column } from '../../../models/TableModel';


interface MatchingColsState {
    matchingCols: Record<string, Column>;
}

interface MatchingColsAction {
    setMatchingCols: (newMatchingCols: Record<string, Column>) => void
}

type MatchingColsStore = MatchingColsState & MatchingColsAction

const useMatchingColumnsStore = create<MatchingColsStore>((set) => ({
    matchingCols: {},
    setMatchingCols: (newMatchingCols: Record<IdType, Column>) => set((state) => ({
        matchingCols: { ...state.matchingCols, ...newMatchingCols }
    }))
}));

export default useMatchingColumnsStore;