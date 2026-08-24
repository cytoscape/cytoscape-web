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
    refreshSequence: {},

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
      entries: ReadonlyArray<readonly [IdType, ResolvedNodeGraphics]>,
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

    clearImages(networkId: IdType, nodeIds: readonly IdType[]) {
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
        // refreshSequence survives on purpose: a renderer that comes back to
        // this network must still see the next token as a change.
        return state
      })
    },

    requestRefresh(networkId: IdType, nodeIds?: readonly IdType[]) {
      set((state) => {
        const prev = state.refreshRequests[networkId]
        // From the per-network sequence, not from the pending request: the
        // request is deleted on consume, so deriving the token from it would
        // reissue 1 and the renderer's selector would see no change.
        const token = (state.refreshSequence[networkId] ?? 0) + 1
        state.refreshSequence[networkId] = token

        // Copied, so a caller that mutates its array after the call cannot
        // change what the renderer runs.
        let nextIds = nodeIds === undefined ? undefined : [...nodeIds]

        if (prev !== undefined) {
          // Merge with the unconsumed request rather than replacing it. Two
          // refresh() calls in one tick notify React once, so the renderer only
          // ever reads the final entry — a replace would silently drop the first
          // call's nodes. Either side asking for the whole network wins.
          nextIds =
            prev.nodeIds === undefined || nextIds === undefined
              ? undefined
              : [...new Set([...prev.nodeIds, ...nextIds])]
        }

        state.refreshRequests[networkId] = { token, nodeIds: nextIds }
        return state
      })
    },

    consumeRefresh(networkId: IdType, token: number) {
      set((state) => {
        // Bounded accumulation depends on this: without an ack, merging would
        // make every refresh re-run every node ever refreshed for this network.
        //
        // Token-checked so a request that arrived after the renderer read this
        // one is not thrown away with it.
        if (state.refreshRequests[networkId]?.token !== token) return state
        delete state.refreshRequests[networkId]
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
