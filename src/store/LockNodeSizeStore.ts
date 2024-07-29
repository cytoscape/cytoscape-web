import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface LockNodeSizeState {
    isWidthLocked: boolean
    isHeightLocked: boolean
    size: number
}

interface LockNodeSizeAction {
    setLockState: (lockState: boolean, size: number, isHeight: boolean) => void
    setSize: (size: number) => void
}

type LockNodeSizeStore = LockNodeSizeState & LockNodeSizeAction

export const useLockNodeSizeStore = create(
    immer<LockNodeSizeStore>((set) => ({
        isWidthLocked: false,
        isHeightLocked: false,
        size: 0,
        setLockState: (lockState: boolean, size: number, isHeight: boolean) => {
            set((state) => {
                if (isHeight) {
                    state.isWidthLocked = lockState;
                } else {
                    state.isHeightLocked = lockState;
                }
                state.size = size;
            })
        },
        setSize: (size: number) => {
            set((state) => {
                state.size = size
            })
        }
    })),
)
