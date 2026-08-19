// src/features/NetworkPanel/CyjsRenderer/useNodeGraphicsSync.ts
//
// Decides WHEN to run app render hooks, and for which nodes.
//
// Renderer-scoped on purpose: called from CyjsRenderer, so no hook work happens
// for background networks, and mounting is the natural first-run trigger.
//
// The hard part is not calling the hook — it is not calling it a hundred
// thousand times. `InMemoryTable` rebuilds EVERY row object on a column
// operation (createColumn, deleteColumn, setColumnName, duplicateColumn,
// applyValueToElements, setTable, add), so a single column rename reports every
// node as changed. Hence the coalescing window and the chunked flush below.

import { useEffect, useRef } from 'react'

import { logApp } from '../../../debug'
import { useNodeGraphicsStore } from '../../../data/hooks/stores/NodeGraphicsStore'
import { useTableStore } from '../../../data/hooks/stores/TableStore'
import { useViewModelStore } from '../../../data/hooks/stores/ViewModelStore'
import { isHydrating } from '../../../data/hooks/stores/hydrationContext'
import type { IdType } from '../../../models/IdType'
import type {
  NodeGraphicsRequest,
  RegisteredNodeGraphicsHook,
  ResolvedNodeGraphics,
} from '../../../models/StoreModel/NodeGraphicsStoreModel'
import type { Table } from '../../../models/TableModel'
import { detectRowDelta } from '../../../models/TableModel/impl/tableDiff'
import { NodeVisualPropertyName } from '../../../models/VisualStyleModel/VisualPropertyName'
import { resolveNodeGraphics } from './nodeGraphicsResolve'

/** Writes inside this window merge into one flush. */
const COALESCE_MS = 50
/** Nodes processed per animation frame, so a large batch never blocks one. */
const CHUNK_SIZE = 200
/** A synchronous hook call slower than this counts against the failure budget. */
const SLOW_CALL_MS = 16
/** Throws plus slow calls before a hook is disabled for the session. */
const FAILURE_BUDGET = 20
/**
 * Distinct image strings per network before new ones are refused.
 *
 * Cytoscape's `getCachedImage` retains one Image per distinct URL with no
 * eviction, freed only by `cy.destroy()`. An app generating a fresh data URI per
 * update would grow that cache without bound.
 */
const MAX_DISTINCT_IMAGES = 2000

/**
 * True when a freshly resolved result is indistinguishable from the stored one.
 *
 * Compares every field, `hookId` included: a node now served by a different hook
 * must be re-attributed, or removing that hook would leave its image behind.
 */
const isSameGraphics = (
  existing: ResolvedNodeGraphics | undefined,
  next: ResolvedNodeGraphics,
): boolean =>
  existing !== undefined &&
  existing.image === next.image &&
  existing.fit === next.fit &&
  existing.opacity === next.opacity &&
  existing.crossOrigin === next.crossOrigin &&
  existing.containment === next.containment &&
  existing.hookId === next.hookId

/**
 * Run the registered hooks for one network and return the resulting images.
 *
 * @param networkId - Network this renderer is showing
 * @returns nodeId → image, or undefined when no hook is registered
 */
export const useNodeGraphicsSync = (
  networkId: IdType,
): Record<IdType, ResolvedNodeGraphics> | undefined => {
  const hooks = useNodeGraphicsStore((state) => state.hooks)
  const images = useNodeGraphicsStore((state) => state.images[networkId])
  const refreshToken = useNodeGraphicsStore(
    (state) => state.refreshRequests[networkId]?.token,
  )
  const nodeTable = useTableStore((state) => state.tables[networkId]?.nodeTable)

  /** Nodes awaiting a hook run. */
  const pendingRef = useRef<Set<IdType>>(new Set())
  /** Set when every node needs a run (mount, hook change, whole-network refresh). */
  const pendingAllRef = useRef<boolean>(true)
  const prevNodeTableRef = useRef<Table | undefined>(undefined)
  /**
   * Bumped whenever queued work becomes invalid (network switch, hook change,
   * unmount). A chunk from an older generation is dropped rather than applied.
   */
  const generationRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const rafRef = useRef<number | undefined>(undefined)
  /** hookId → throws + slow calls so far. */
  const failuresRef = useRef<Map<string, number>>(new Map())
  const degradedRef = useRef<Set<string>>(new Set())
  const distinctImagesRef = useRef<Set<string>>(new Set())
  const imageCapReportedRef = useRef<boolean>(false)

  // Read in the flush without making it an effect dependency.
  const hooksRef = useRef<RegisteredNodeGraphicsHook[]>(hooks)
  hooksRef.current = hooks
  const nodeTableRef = useRef<Table | undefined>(nodeTable)
  nodeTableRef.current = nodeTable

  // ── The flush ──────────────────────────────────────────────────────────────

  const cancelScheduled = (): void => {
    if (timerRef.current !== undefined) {
      clearTimeout(timerRef.current)
      timerRef.current = undefined
    }
    if (rafRef.current !== undefined) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = undefined
    }
  }

  /**
   * Discard queued work: cancel the timer and any in-flight chunk loop, and bump
   * the generation so a chunk that already escaped cancellation drops its
   * results instead of applying them to the wrong network.
   */
  const invalidateQueuedWork = (): void => {
    generationRef.current++
    cancelScheduled()
  }

  const flushRef = useRef<() => void>(() => {})

  const schedule = (): void => {
    if (timerRef.current !== undefined) return
    timerRef.current = setTimeout(() => {
      timerRef.current = undefined
      flushRef.current()
    }, COALESCE_MS)
  }

  flushRef.current = function flush(): void {
    const activeHooks = hooksRef.current.filter(
      (h) => !degradedRef.current.has(h.hookId),
    )
    const table = nodeTableRef.current

    if (activeHooks.length === 0 || table === undefined) {
      pendingRef.current.clear()
      pendingAllRef.current = false
      return
    }

    // A peer tab's edit arrives as a full-table replace, so every row looks
    // changed. Wait it out rather than re-running the hook for the whole
    // network; the pending set is preserved, so nothing is lost.
    if (isHydrating()) {
      schedule()
      return
    }

    const targets = pendingAllRef.current
      ? Array.from(table.rows.keys())
      : Array.from(pendingRef.current)

    pendingRef.current.clear()
    pendingAllRef.current = false

    if (targets.length === 0) return

    const generation = generationRef.current
    const viewModel = useViewModelStore.getState().getViewModel(networkId)

    let index = 0

    const processChunk = (): void => {
      rafRef.current = undefined
      // Network switched, hook changed, or unmounted while chunks were queued.
      if (generation !== generationRef.current) return

      const entries: Array<[IdType, ResolvedNodeGraphics]> = []
      /** Nodes the hook used to serve and now declines. */
      const declined: IdType[] = []
      const end = Math.min(index + CHUNK_SIZE, targets.length)
      const existing = useNodeGraphicsStore.getState().images[networkId] ?? {}

      for (; index < end; index++) {
        const nodeId = targets[index]
        const row = table.rows.get(nodeId)
        // Deleted between queueing and now; the table-diff effect already
        // dropped its image.
        if (row === undefined) continue

        const nodeView = viewModel?.nodeViews[nodeId]
        const request: NodeGraphicsRequest = {
          networkId,
          nodeId,
          // A copy: an app must not be able to mutate host table state.
          attributes: { ...row },
          width: nodeView?.values.get(NodeVisualPropertyName.NodeWidth) as
            | number
            | undefined,
          height: nodeView?.values.get(NodeVisualPropertyName.NodeHeight) as
            | number
            | undefined,
        }

        const resolved = runHooks(activeHooks, request)
        if (resolved === null) {
          // Declining is a real answer, not a no-op: a node whose data no longer
          // qualifies must lose the image it had, or a stale picture survives
          // until the next refresh or network switch.
          if (existing[nodeId] !== undefined) declined.push(nodeId)
          continue
        }

        // A reference-new but field-identical result would re-enter Cytoscape's
        // unbounded image cache for nothing. Every field is compared, not just
        // the image: a hook that keeps the same URL and changes only `opacity`
        // or `fit` is making a real change and must not be skipped.
        if (isSameGraphics(existing[nodeId], resolved)) continue

        if (
          !distinctImagesRef.current.has(resolved.image) &&
          distinctImagesRef.current.size >= MAX_DISTINCT_IMAGES
        ) {
          if (!imageCapReportedRef.current) {
            imageCapReportedRef.current = true
            logApp.warn(
              `[nodeGraphics]: reached ${MAX_DISTINCT_IMAGES} distinct images for network ${networkId}; ` +
                'refusing new ones. Prefer stable URLs over freshly generated data URIs.',
            )
          }
          continue
        }
        distinctImagesRef.current.add(resolved.image)

        entries.push([nodeId, resolved])
      }

      // One write per chunk, so a large batch repaints progressively instead of
      // stalling once at the end.
      if (entries.length > 0) {
        useNodeGraphicsStore.getState().setImages(networkId, entries)
      }
      if (declined.length > 0) {
        useNodeGraphicsStore.getState().clearImages(networkId, declined)
      }

      if (index < targets.length) {
        rafRef.current = requestAnimationFrame(processChunk)
      }
    }

    rafRef.current = requestAnimationFrame(processChunk)
  }

  /**
   * Call hooks in registration order; the first non-null result wins. A hook
   * returning null yields to the next one, which is what makes multiple apps
   * compose.
   */
  const runHooks = (
    activeHooks: RegisteredNodeGraphicsHook[],
    request: NodeGraphicsRequest,
  ): ResolvedNodeGraphics | null => {
    for (const hook of activeHooks) {
      // Re-checked per call, not just per flush: a hook that starts failing on
      // node 1 of 100000 must stop being called on node 21, not at the next
      // flush.
      if (degradedRef.current.has(hook.hookId)) continue

      let result
      const startedAt = performance.now()
      try {
        result = hook.render(request)
      } catch (e) {
        noteFailure(hook.hookId, `threw: ${String(e)}`)
        continue
      }
      const elapsed = performance.now() - startedAt
      if (elapsed > SLOW_CALL_MS) {
        noteFailure(hook.hookId, `took ${elapsed.toFixed(0)}ms`)
      }

      const resolved = resolveNodeGraphics(result, hook.hookId)
      if (resolved !== null) return resolved
    }
    return null
  }

  /**
   * Count a throw or a slow call, and disable the hook once it exhausts its
   * budget. Without this, a broken hook burns time on every table edit for the
   * rest of the session. Images it already produced are left alone.
   */
  const noteFailure = (hookId: string, detail: string): void => {
    const count = (failuresRef.current.get(hookId) ?? 0) + 1
    failuresRef.current.set(hookId, count)
    if (count >= FAILURE_BUDGET && !degradedRef.current.has(hookId)) {
      degradedRef.current.add(hookId)
      logApp.warn(
        `[nodeGraphics]: disabling render hook ${hookId} after ${count} failures (last: ${detail})`,
      )
    }
  }

  // ── Triggers ───────────────────────────────────────────────────────────────

  // Network switch: nothing queued for the old network is valid.
  useEffect(
    function onNetworkChange() {
      invalidateQueuedWork()
      prevNodeTableRef.current = undefined
      pendingRef.current.clear()
      pendingAllRef.current = true
      distinctImagesRef.current.clear()
      imageCapReportedRef.current = false
      schedule()
      // eslint-disable-next-line react-hooks/exhaustive-deps -- schedule/invalidateQueuedWork are stable closures over refs
    },
    [networkId],
  )

  // Hook registered, replaced, or cleared.
  useEffect(
    function onHooksChange() {
      invalidateQueuedWork()

      if (hooks.length === 0) {
        // Drop every image so nodes fall back to their Vizmapper graphics.
        pendingRef.current.clear()
        pendingAllRef.current = false
        useNodeGraphicsStore.getState().clearNetwork(networkId)
        return
      }

      failuresRef.current.clear()
      degradedRef.current.clear()
      pendingAllRef.current = true
      schedule()
      // eslint-disable-next-line react-hooks/exhaustive-deps -- schedule/invalidateQueuedWork are stable closures over refs
    },
    [hooks, networkId],
  )

  // Table edit. Also covers node creation (a new node is a new row).
  useEffect(
    function onNodeTableChange() {
      if (nodeTable === undefined) return

      const prev = prevNodeTableRef.current
      prevNodeTableRef.current = nodeTable

      // First sighting: the mount effect already queued every node.
      if (prev === undefined || prev === nodeTable) return

      const { changed, removed } = detectRowDelta(nodeTable, prev)

      if (removed.length > 0) {
        // Deleted nodes need their image dropped, never a hook call.
        useNodeGraphicsStore.getState().clearImages(networkId, removed)
      }
      if (changed.length === 0) return

      for (const nodeId of changed) {
        pendingRef.current.add(nodeId)
      }
      schedule()
      // eslint-disable-next-line react-hooks/exhaustive-deps -- schedule is a stable closure over refs
    },
    [nodeTable, networkId],
  )

  // App-driven refresh, for images that depend on the app's own state.
  useEffect(
    function onRefreshRequest() {
      if (refreshToken === undefined) return

      const request = useNodeGraphicsStore.getState().refreshRequests[networkId]
      if (request === undefined) return

      if (request.nodeIds === undefined) {
        pendingAllRef.current = true
      } else {
        for (const nodeId of request.nodeIds) {
          pendingRef.current.add(nodeId)
        }
      }
      // The work now lives in the pending set, so release the request. This is
      // what stops requestRefresh's merge from accumulating node ids forever.
      useNodeGraphicsStore.getState().consumeRefresh(networkId, request.token)
      // An app that recomputed its images expects them to replace the old ones,
      // so the dedupe cache must not veto a repeat of an earlier image.
      distinctImagesRef.current.clear()
      imageCapReportedRef.current = false
      schedule()
      // eslint-disable-next-line react-hooks/exhaustive-deps -- schedule is a stable closure over refs
    },
    [refreshToken, networkId],
  )

  // Unmount: cancel queued work and drop this network's images, since nothing
  // is left to display them.
  useEffect(
    function onUnmount() {
      return () => {
        invalidateQueuedWork()
        useNodeGraphicsStore.getState().clearNetwork(networkId)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps -- invalidateQueuedWork is a stable closure over refs
    },
    [networkId],
  )

  return images
}
