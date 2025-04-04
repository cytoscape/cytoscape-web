import { subscribeWithSelector } from 'zustand/middleware'
import { create, StateCreator, StoreApi } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { UndoRedoStack, UndoStore } from '../models/StoreModel/UndoStoreModel'
import { putUndoRedoStackToDb } from './persist/db'
import { useWorkspaceStore } from './WorkspaceStore'

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
    persist((set, get) => ({
      undoRedoStacks: {},
      addStack: (networkId, undoRedoStack: UndoRedoStack) => {
        set((state) => {
          state.undoRedoStacks[networkId] = undoRedoStack
          return state
        })
      },
      setUndoStack: (networkId, undoStack) =>
        set((state) => {
          state.undoRedoStacks[networkId].undoStack = undoStack
          return state
        }),
      setRedoStack: (networkId, redoStack) =>
        set((state) => {
          state.undoRedoStacks[networkId].redoStack = redoStack
          return state
        }),
    })),
  ),
)
