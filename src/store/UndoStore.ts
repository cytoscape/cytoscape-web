import { create, StateCreator, StoreApi } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import {
  Edit,
  UndoRedoStack,
  UndoStore,
} from '../models/StoreModel/UndoStoreModel'
import { putUndoRedoStackToDb } from './persist/db'
import { useWorkspaceStore } from './WorkspaceStore'
import { IdType } from '../models'

const persist =
  (config: StateCreator<UndoStore>) =>
  (
    set: StoreApi<UndoStore>['setState'],
    get: StoreApi<UndoStore>['getState'],
    api: StoreApi<UndoStore>,
  ) =>
    config(
      async (args) => {
        const currentNetworkId =
          useWorkspaceStore.getState().workspace.currentNetworkId

        set(args)
        const updated = get().undoRedoStacks[currentNetworkId]
        const deleted = updated === undefined

        if (!deleted) {
          await putUndoRedoStackToDb(currentNetworkId, updated).then(() => {})
        }
      },
      get,
      api,
    )

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
    })),
  ),
)
