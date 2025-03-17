import { subscribeWithSelector } from 'zustand/middleware'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { UndoStore, UndoStore2 } from '../models/StoreModel/UndoStoreModel'

export const useUndoStore = create(
  subscribeWithSelector(
    immer<UndoStore>((set, get) => ({
      undoStack: [],
      redoStack: [],
      setUndoStack: (undoStack) =>
        set((state) => {
          state.undoStack = undoStack
        }),
      setRedoStack: (redoStack) =>
        set((state) => {
          state.redoStack = redoStack
        }),
    })),
  ),
)

export const useUndoStore2 = create(
  subscribeWithSelector(
    immer<UndoStore2>((set, get) => ({
      undoStack: [],
      redoStack: [],
      setUndoStack: (undoStack) =>
        set((state) => {
          state.undoStack = undoStack
        }),
      setRedoStack: (redoStack) =>
        set((state) => {
          state.redoStack = redoStack
        }),
    })),
  ),
)
