import { create, StateCreator } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { IdType } from '../../../models'
import {
  Edit,
  UndoRedoStack,
  UndoStore,
} from '../../../models/StoreModel/UndoStoreModel'
import { deleteUndoRedoStackFromDb, putUndoRedoStackToDb } from '../../db'
import { toPlainObject } from '../../db/serialization'
import { persistNetworkSlices } from './persistNetworkSlices'

const persist = (config: StateCreator<UndoStore>) =>
  persistNetworkSlices<UndoStore, UndoRedoStack>(config, {
    label: 'UndoStore',
    selectSlices: (state) => state.undoRedoStacks,
    // Convert Immer proxy to plain object before saving
    putSlice: (networkId, stack) =>
      putUndoRedoStackToDb(networkId, toPlainObject(stack)),
    removeSlice: (networkId) => deleteUndoRedoStackFromDb(networkId),
  })

export const useUndoStore = create(
  immer<UndoStore>(
    persist((set) => ({
      undoRedoStacks: {},
      addStack: (networkId: IdType, undoRedoStack: UndoRedoStack) => {
        set((state) => {
          state.undoRedoStacks[networkId] = undoRedoStack
          return state
        })
      },
      setUndoStack: (networkId: IdType, undoStack: Edit[]) =>
        set((state) => {
          // For safety, check if the stack exists before modifying it
          if (!state.undoRedoStacks[networkId]) {
            state.undoRedoStacks[networkId] = {
              undoStack: [],
              redoStack: [],
            }
          }
          state.undoRedoStacks[networkId].undoStack = undoStack
          return state
        }),
      setRedoStack: (networkId: IdType, redoStack: Edit[]) =>
        set((state) => {
          // For safety, check if the stack exists before modifying it
          if (!state.undoRedoStacks[networkId]) {
            state.undoRedoStacks[networkId] = {
              undoStack: [],
              redoStack: [],
            }
          }
          state.undoRedoStacks[networkId].redoStack = redoStack
          return state
        }),
      deleteStack: (networkId: IdType) =>
        set((state) => {
          delete state.undoRedoStacks[networkId]
          return state
        }),
      deleteAllStacks: () =>
        set((state) => {
          state.undoRedoStacks = {}
          return state
        }),
    })),
  ),
)
