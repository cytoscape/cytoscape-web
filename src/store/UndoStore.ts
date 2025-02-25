
import { subscribeWithSelector } from 'zustand/middleware'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { UndoStore } from '../models/StoreModel/UndoStoreModel'


export const useUndoStore = create(
  subscribeWithSelector(
  immer<UndoStore>((set, get) => ({
    undoStack: [],
    redoStack: [],
    setUndoStack: (undoStack) => set((state) => { state.undoStack = undoStack }),
    setRedoStack: (redoStack) => set((state) => { state.redoStack = redoStack }),
      }
  )))
)
