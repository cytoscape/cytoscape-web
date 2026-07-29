/**
 * @deprecated The Module Federation exposure of this store (cyweb/WorkspaceStore) is deprecated for external apps.
 * This store is still actively used internally by the host application — it is NOT being removed.
 * External apps should use the App API (e.g., `cyweb/NetworkApi`) instead of importing this store directly.
 * This cyweb/WorkspaceStore Module Federation export will be removed after 2 release cycles.
 */
import { create, StateCreator, StoreApi } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import { logStore } from '../../../debug'
import { AppStatus } from '../../../models/AppModel/AppStatus'
import { InstalledApp } from '../../../models/AppModel/InstalledApp'
import { IdType } from '../../../models/IdType'
import { WorkspaceStore } from '../../../models/StoreModel/WorkspaceStoreModel'
import { Workspace } from '../../../models/WorkspaceModel'
import * as WorkspaceImpl from '../../../models/WorkspaceModel/impl/workspaceImpl'
import { announceDatabaseReset } from '@/data/db/lifecycle'
import { deleteDb, putWorkspaceToDb } from '../../db'
import { toPlainObject } from '../../db/serialization'
import { isHydrating } from './hydrationContext'

const EMPTY_WORKSPACE: Workspace = {
  id: '',
  name: '',
  isRemote: false,
  networkIds: [],
  networkModified: {},
  creationTime: new Date(),
  localModificationTime: new Date(),
  currentNetworkId: '',
}

/**
 * Blank `currentNetworkId` before the workspace goes to IndexedDB.
 *
 * Which network a tab is looking at is per-tab view state — every tab has its
 * own address bar — but it was being written to the single shared workspace row,
 * so tabs overwrote each other's navigation. Hydration used to mask the field on
 * read, which was not enough: the next local workspace mutation wrote this tab's
 * value straight back into the shared row.
 *
 * The per-tab sources of truth are the URL and the sessionStorage backstop in
 * `src/data/tabState/tabNetwork.ts`; the field is kept in the in-memory store (lots
 * of code reads it) but is no longer shared. Blanked rather than omitted so the
 * row still satisfies `validateWorkspace`.
 */
const withoutTabNetworkId = (workspace: Workspace): Workspace => ({
  ...workspace,
  currentNetworkId: '',
})

/**
 * Compare two workspace rows ignoring `localModificationTime`, which changes on
 * every mutation and would defeat the no-op check.
 */
const isSameSharedWorkspace = (a: Workspace, b: Workspace): boolean =>
  JSON.stringify({ ...a, localModificationTime: 0 }) ===
  JSON.stringify({ ...b, localModificationTime: 0 })

const persist =
  (config: StateCreator<WorkspaceStore>) =>
  (
    set: StoreApi<WorkspaceStore>['setState'],
    get: StoreApi<WorkspaceStore>['getState'],
    api: StoreApi<WorkspaceStore>,
  ) => {
    return config(
      (args) => {
        logStore.info('[WorkspaceStore]: Persisting workspace store')
        const lastWorkspace = get().workspace
        set(args)
        const newWorkspace = get().workspace
        if (
          !isHydrating() &&
          lastWorkspace !== newWorkspace &&
          newWorkspace.id !== ''
        ) {
          // Convert Immer proxy to plain object before saving
          const plainWorkspace = toPlainObject(
            withoutTabNetworkId(newWorkspace),
          )
          // Switching networks changes only per-tab state, so it leaves the
          // shared row byte-identical — skip the write rather than mint a
          // change record every other tab would then hydrate.
          if (
            !isSameSharedWorkspace(
              plainWorkspace,
              toPlainObject(withoutTabNetworkId(lastWorkspace)),
            )
          ) {
            void putWorkspaceToDb(plainWorkspace).catch((e) => {
              logStore.error(
                `[${useWorkspaceStore.name}]: Failed to persist workspace`,
                e,
              )
            })
          }
        }
      },
      get,
      api,
    )
  }
export const useWorkspaceStore = create(
  subscribeWithSelector(
    immer<WorkspaceStore>(
      persist((set) => ({
        workspace: EMPTY_WORKSPACE,
        set: (workspace: Workspace) => {
          set((state) => {
            state.workspace = workspace
            return state
          })
        },
        setId: (id: IdType) => {
          set((state) => {
            state.workspace = WorkspaceImpl.setId(state.workspace, id)
            return state
          })
        },
        setCurrentNetworkId: (newId: IdType) => {
          set((state) => {
            state.workspace = WorkspaceImpl.setCurrentNetworkId(
              state.workspace,
              newId,
            )
            return state
          })
        },
        setName: (name: string) => {
          set((state) => {
            state.workspace = WorkspaceImpl.setName(state.workspace, name)
            return state
          })
        },
        setIsRemote: (isRemote: boolean) => {
          set((state) => {
            state.workspace = WorkspaceImpl.setIsRemote(
              state.workspace,
              isRemote,
            )
            return state
          })
        },
        addNetworkIds: (ids: IdType | IdType[]) => {
          set((state) => {
            state.workspace = WorkspaceImpl.addNetworkIds(state.workspace, ids)
            return state
          })
        },
        deleteCurrentNetwork: () => {
          set((state) => {
            state.workspace = WorkspaceImpl.deleteCurrentNetwork(
              state.workspace,
            )
            return state
          })
        },
        deleteAllNetworks: () => {
          set((state) => {
            state.workspace = WorkspaceImpl.deleteAllNetworks(state.workspace)
            return state
          })
        },
        deleteNetwork: (id: IdType | IdType[]) => {
          set((state) => {
            state.workspace = WorkspaceImpl.deleteNetwork(state.workspace, id)
            return state
          })
        },
        resetWorkspace: async () => {
          // Other tabs hold the database open, and IndexedDB will not delete a
          // database with live connections. Ask them to let go and wait for the
          // acknowledgements before deleting; release them afterwards so their
          // reload lands on the freshly created database rather than racing the
          // delete and re-creating the old workspace.
          const releasePeers = await announceDatabaseReset()
          const deleted = await deleteDb()

          // Release the peers either way: they have already closed their
          // connections and are waiting, so signalling lets them reload
          // promptly instead of stalling until their timeout.
          releasePeers()

          if (!deleted) {
            // Nothing was destroyed. Resetting the store to EMPTY_WORKSPACE here
            // would show the user an empty workspace while their data is still
            // on disk, and the next write would persist that fiction.
            logStore.error(
              `[${useWorkspaceStore.name}]: Workspace reset aborted — the database could not be deleted`,
            )
            return
          }

          logStore.info(
            `[${useWorkspaceStore.name}]: IndexedDB cleared (Workspace cache has been reset)`,
          )
          set((state) => {
            logStore.info(
              `[${useWorkspaceStore.name}]: Now creating a new workspace`,
            )
            state.workspace = EMPTY_WORKSPACE
            return state
          })
        },

        setNetworkModified: (networkId: IdType, isModified: boolean) => {
          set((state) => {
            state.workspace = WorkspaceImpl.setNetworkModified(
              state.workspace,
              networkId,
              isModified,
            )
            return state
          })
        },

        deleteNetworkModifiedStatus: (networkId: IdType) => {
          set((state) => {
            state.workspace = WorkspaceImpl.deleteNetworkModifiedStatus(
              state.workspace,
              networkId,
            )
            return state
          })
        },

        deleteAllNetworkModifiedStatuses: () => {
          set((state) => {
            state.workspace = WorkspaceImpl.deleteAllNetworkModifiedStatuses(
              state.workspace,
            )
            return state
          })
        },

        addInstalledApp: (app: InstalledApp) => {
          set((state) => {
            state.workspace = WorkspaceImpl.addInstalledApp(
              state.workspace,
              app,
            )
            return state
          })
        },

        removeInstalledApp: (id: IdType) => {
          set((state) => {
            state.workspace = WorkspaceImpl.removeInstalledApp(
              state.workspace,
              id,
            )
            return state
          })
        },

        setInstalledAppStatus: (id: IdType, status: AppStatus) => {
          set((state) => {
            const exists = (state.workspace.installedApps ?? []).some(
              (a) => a.entry.id === id,
            )
            if (!exists) {
              logStore.warn(
                `[${useWorkspaceStore.name}]: setInstalledAppStatus: app "${id}" not found in installedApps`,
              )
              return state
            }
            state.workspace = WorkspaceImpl.setInstalledAppStatus(
              state.workspace,
              id,
              status,
            )
            return state
          })
        },
      })),
    ),
  ),
)
