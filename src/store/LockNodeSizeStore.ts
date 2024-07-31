import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export enum LockedDimension {
    width = 'width',
    height = 'height',
    none = 'none'
}

interface LockNodeSizeState {
    isLocked: boolean
    lockedDimension: 'width' | 'height' | 'none'
    sharedState: {
        size: number
    }
}

interface LockNodeSizeAction {
    toggleLockState: (lockState?: boolean) => void
    setLockDimension: (dimension: LockedDimension) => void
    setSize: (size: number) => void
}

type LockNodeSizeStore = LockNodeSizeState & LockNodeSizeAction

export const useLockNodeSizeStore = create(
    immer<LockNodeSizeStore>((set) => ({
        isLocked: false,
        lockedDimension: LockedDimension.none,
        sharedState: {
            size: 0
        },
        toggleLockState: (lockState?: boolean) => {
            set(state => {
                state.isLocked = lockState ?? !state.isLocked; // Lock width when height is toggled
            });
        },
        setLockDimension: (dimension: LockedDimension) => {
            set(state => {
                state.lockedDimension = dimension;
            });
        },
        setSize: (size: number) => {
            set((state) => {
                state.sharedState.size = size
            })
        }
    })),
)
