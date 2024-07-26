import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface LockNodeSizeState {
    isWidthLocked: boolean
    isHeightLocked: boolean
}

interface LockNodeSizeAction {
    setLockState: (lockState: boolean, isHeight: boolean) => void
}

type LockNodeSizeStore = LockNodeSizeState & LockNodeSizeAction

export const useLockNodeSizeStore = create(
    immer<LockNodeSizeStore>((set) => ({
        isWidthLocked: false,
        isHeightLocked: false,
        setLockState: (lockState: boolean, isHeight: boolean) => {
            set((state) => {
                if (isHeight) {
                    state.isHeightLocked = lockState;
                } else {
                    state.isWidthLocked = lockState;
                }
            })
        },
    })),
)
