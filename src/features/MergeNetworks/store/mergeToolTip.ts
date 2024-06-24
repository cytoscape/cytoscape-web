import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface MergeToolTipState {
    text: string,
    isOpen: boolean;
}

interface MergeToolTipAction {
    setText: (toolTipText: string) => void
    setIsOpen: (openToolTip: boolean) => void;
}

type MergeToolTipStore = MergeToolTipState & MergeToolTipAction

const useMergeToolTipStore = create(immer<MergeToolTipStore>((set) => ({
    text: 'Please select networks to merge',
    isOpen: false,
    setText: (toolTipText: string) => set(() => ({ text: toolTipText })),
    setIsOpen: (openToolTip: boolean) => set(() => ({ isOpen: openToolTip }))
})));

export default useMergeToolTipStore;