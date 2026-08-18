// src/data/hooks/stores/NodeGraphicsStore.ts
//
// Registry for app-supplied node-graphics render hooks, plus the images they
// have produced.
//
// NO PERSISTENCE, DELIBERATELY. Hook output is renderer-only: it must never
// reach IndexedDB (it would bloat the DB and thrash cross-tab sync) and must
// never reach CX2 (the export contract — see
// docs/design/custom-graphics-image/node-graphics-render-hook.md). The CX2
// exporter reads `CyNetwork` fields only, and this store is not one of them.
//
// Immer is safe here even though state holds functions. A bare function is not
// `isDraftable`, so immer's deep freeze walks past it — `RendererFunctionStore`
// stores raw functions under immer for the same reason. Do NOT "fix" this by
// copying `AppResourceStore`'s no-immer setup: that carve-out exists because
// `React.lazy()` returns a plain object whose mutable `_status` immer freezes.
//
// Registry and images share one store on purpose: unregistering a hook must
// atomically drop its images, and splitting them would expose an intermediate
// state to the renderer.

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { IdType } from '../../../models/IdType'
import type {
  NodeGraphicsStoreModel,
  RegisteredNodeGraphicsHook,
  ResolvedNodeGraphics,
} from '../../../models/StoreModel/NodeGraphicsStoreModel'
import { registerAppCleanup } from './AppCleanupRegistry'

/** Drop every image produced by the given hook ids, across all networks. */
const dropImagesByHookIds = (
  images: Record<IdType, Record<IdType, ResolvedNodeGraphics>>,
  hookIds: Set<string>,
): void => {
  if (hookIds.size === 0) return
  for (const networkId of Object.keys(images)) {
    const perNode = images[networkId]
    for (const nodeId of Object.keys(perNode)) {
      if (hookIds.has(perNode[nodeId].hookId)) {
        delete perNode[nodeId]
      }
    }
  }
}

export const useNodeGraphicsStore = create(
  immer<NodeGraphicsStoreModel>((set) => ({
    hooks: [],
    images: {},
    refreshRequests: {},

    setHook(hook: RegisteredNodeGraphicsHook) {
      set((state) => {
        // One hook per app: replacing drops the previous hook's images so a
        // re-registration cannot leave stale pictures on screen.
        const existing = state.hooks.filter((h) => h.appId === hook.appId)
        if (existing.length > 0) {
          dropImagesByHookIds(
            state.images,
            new Set(existing.map((h) => h.hookId)),
          )
          state.hooks = state.hooks.filter((h) => h.appId !== hook.appId)
        }
        state.hooks.push(hook)
        return state
      })
    },

    removeAllByAppId(appId: string) {
      set((state) => {
        // Anonymous hooks (appId === undefined) are never removed here — they
        // belong to window.CyWebApi and have no lifecycle to hook into.
        const doomed = state.hooks.filter(
          (h) => h.appId !== undefined && h.appId === appId,
        )
        if (doomed.length === 0) return state
        dropImagesByHookIds(state.images, new Set(doomed.map((h) => h.hookId)))
        state.hooks = state.hooks.filter(
          (h) => h.appId === undefined || h.appId !== appId,
        )
        return state
      })
    },

    removeAnonymousHook() {
      set((state) => {
        const doomed = state.hooks.filter((h) => h.appId === undefined)
        if (doomed.length === 0) return state
        dropImagesByHookIds(state.images, new Set(doomed.map((h) => h.hookId)))
        state.hooks = state.hooks.filter((h) => h.appId !== undefined)
        return state
      })
    },

    setImages(
      networkId: IdType,
      entries: Array<[IdType, ResolvedNodeGraphics]>,
    ) {
      if (entries.length === 0) return
      set((state) => {
        const perNode = state.images[networkId] ?? {}
        for (const [nodeId, resolved] of entries) {
          perNode[nodeId] = resolved
        }
        state.images[networkId] = perNode
        return state
      })
    },

    clearImages(networkId: IdType, nodeIds: IdType[]) {
      if (nodeIds.length === 0) return
      set((state) => {
        const perNode = state.images[networkId]
        if (perNode === undefined) return state
        for (const nodeId of nodeIds) {
          delete perNode[nodeId]
        }
        return state
      })
    },

    clearNetwork(networkId: IdType) {
      set((state) => {
        delete state.images[networkId]
        delete state.refreshRequests[networkId]
        return state
      })
    },

    requestRefresh(networkId: IdType, nodeIds?: IdType[]) {
      set((state) => {
        const prev = state.refreshRequests[networkId]
        state.refreshRequests[networkId] = {
          token: (prev?.token ?? 0) + 1,
          nodeIds,
        }
        return state
      })
    },
  })),
)

// Lets appLifecycle.ts clean up an app's hook and images via
// cleanupAllForApp(appId), with no changes needed there.
registerAppCleanup((appId) =>
  useNodeGraphicsStore.getState().removeAllByAppId(appId),
)
