import {
  getFilterFromDb,
  getNetworkFromDb,
  getNetworkSummaryFromDb,
  getNetworkViewsFromDb,
  getOpaqueAspectsFromDb,
  getTablesFromDb,
  getUiStateFromDb,
  getUndoRedoStackFromDb,
  getViewSelectionFromDb,
  getVisualStyleFromDb,
  getWorkspaceFromDb,
} from '@/data/db'
import { useFilterStore } from '@/data/hooks/stores/FilterStore'
import { setHydrating } from '@/data/hooks/stores/hydrationContext'
import { useNetworkStore } from '@/data/hooks/stores/NetworkStore'
import { useNetworkSummaryStore } from '@/data/hooks/stores/NetworkSummaryStore'
import { useOpaqueAspectStore } from '@/data/hooks/stores/OpaqueAspectStore'
import { useTableStore } from '@/data/hooks/stores/TableStore'
import { useUiStateStore } from '@/data/hooks/stores/UiStateStore'
import { useUndoStore } from '@/data/hooks/stores/UndoStore'
import { useViewModelStore } from '@/data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '@/data/hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '@/data/hooks/stores/WorkspaceStore'
import { logUi } from '@/debug'
import type { NetworkView } from '@/models/ViewModel'

/**
 * Mirrors dexie-observable's `DatabaseChangeType`. Declared locally rather than
 * imported because that enum is an ambient `const enum`, which cannot be
 * imported as a value under isolated modules.
 */
const ChangeType = {
  CREATED: 1,
  UPDATED: 2,
  DELETED: 3,
} as const

/**
 * The part of a dexie-observable change that hydration acts on.
 *
 * Deliberately narrower than `IDatabaseChange`: every case below re-reads the
 * row's current value rather than applying the change's `mods`/`obj` payload,
 * so those fields are neither needed nor trusted here. `IDatabaseChange[]` is
 * assignable to this, so callers can pass the raw event through.
 */
export interface CrossTabChange {
  table: string
  type: number
  key: any
  source?: string | null
}

/**
 * A prepared store mutation. MUST be synchronous — see
 * {@link hydrateFromCrossTabChange} for why.
 */
type ApplyTask = () => void

/** Ordered id-list equality. Selection arrays are built deterministically. */
const sameIds = (
  a: readonly string[] = [],
  b: readonly string[] = [],
): boolean => a.length === b.length && a.every((id, i) => id === b[i])

/**
 * The view `persistSelection` in ViewModelStore reads and writes selection for.
 * Hydration must compare against the same one, or the echo guard below looks at
 * a view whose selection was never persisted.
 */
const selectionView = (views: readonly NetworkView[] | undefined) =>
  views?.find((v) => v.type !== 'circlePacking') ?? views?.[0]

/**
 * Collapse a change batch to one entry per row, keeping the last.
 *
 * dexie-observable delivers every revision it has replayed, so a batch
 * routinely holds many changes for the same row (a drag produces one per
 * coalesced write). Hydrating each one meant re-reading — and for `cyNetworks`,
 * re-deserializing a network of up to 26k elements — once per entry. Only the
 * final state of each row matters, since every case below reads the row's
 * current value rather than applying a delta.
 *
 * Insertion order is revision order, and `Map` preserves it, so the resulting
 * apply order still respects cross-table dependencies (e.g. `workspace` before
 * `uiState`, whose hydration reads `workspace.networkIds`).
 */
const dedupeChanges = (changes: CrossTabChange[]): CrossTabChange[] => {
  const latestByRow = new Map<string, CrossTabChange>()
  for (const change of changes) {
    latestByRow.set(`${change.table}:${String(change.key)}`, change)
  }
  return [...latestByRow.values()]
}

/**
 * Read what a change refers to and return a synchronous task that applies it.
 *
 * All IndexedDB reads happen here, in the async fetch phase. Returns `null`
 * when there is nothing to apply (unknown table, or the row is gone).
 */
const prepareChange = async (
  change: CrossTabChange,
): Promise<ApplyTask | null> => {
  const { type, table, key } = change

  switch (table) {
    case 'workspace': {
      // A workspace row is never deleted from under the user.
      if (type === ChangeType.DELETED) {
        return null
      }
      const ws = await getWorkspaceFromDb(key)
      if (!ws) {
        return null
      }
      return () => {
        const localWs = useWorkspaceStore.getState().workspace

        // `currentNetworkId` is per-tab and no longer stored in the shared row
        // (see `withoutTabNetworkId` in WorkspaceStore), so keep this tab's —
        // unless the network it was on has been removed by the other tab, in
        // which case fall back to whatever is left.
        const isLocalNetworkStillValid = ws.networkIds.includes(
          localWs.currentNetworkId,
        )

        useWorkspaceStore.getState().set({
          ...ws,
          currentNetworkId: isLocalNetworkStillValid
            ? localWs.currentNetworkId
            : (ws.networkIds[0] ?? ''),
        })
      }
    }

    case 'cyNetworks': {
      if (type === ChangeType.DELETED) {
        return () => useNetworkStore.getState().delete(key)
      }
      const net = await getNetworkFromDb(key)
      if (!net) {
        return null
      }
      return () => useNetworkStore.getState().add(net)
    }

    case 'cyNetworkViews': {
      if (type === ChangeType.DELETED) {
        return () => useViewModelStore.getState().delete(key)
      }
      const views = await getNetworkViewsFromDb(key)
      if (!views) {
        return null
      }
      return () => {
        views.forEach((view) => {
          useViewModelStore.getState().add(key, view)
        })
      }
    }

    case 'viewSelections': {
      // Selection is shared across tabs, but in its own row since DB v11 so a
      // click no longer drags the whole view model through every tab.
      const selection =
        type === ChangeType.DELETED
          ? { selectedNodes: [], selectedEdges: [] }
          : await getViewSelectionFromDb(key)
      if (selection === undefined) {
        return null
      }
      return () => {
        // No-op when this tab has not loaded the network; it will read the
        // selection from the DB when it does.
        const views = useViewModelStore.getState().viewModels[key]
        if (views === undefined) {
          return
        }

        // Don't clobber a selection that already matches. This is the one apply
        // task that overwrites local state outright rather than merging into it,
        // so it is the one place where a change that reached us by mistake — a
        // missing origin stamp, if `stampTransactionSource` ever stops firing —
        // would destroy the user's live selection instead of being a wasteful
        // no-op. Making it idempotent means correctness no longer rests solely
        // on that Dexie internal.
        const local = selectionView(views)
        if (
          sameIds(local?.selectedNodes, selection.selectedNodes) &&
          sameIds(local?.selectedEdges, selection.selectedEdges)
        ) {
          return
        }

        useViewModelStore
          .getState()
          .exclusiveSelect(
            key,
            selection.selectedNodes,
            selection.selectedEdges,
          )
      }
    }

    case 'cyVisualStyles': {
      if (type === ChangeType.DELETED) {
        return () => useVisualStyleStore.getState().delete(key)
      }
      const style = await getVisualStyleFromDb(key)
      if (!style) {
        return null
      }
      return () => useVisualStyleStore.getState().add(key, style)
    }

    case 'cyTables': {
      if (type === ChangeType.DELETED) {
        return () => useTableStore.getState().delete(key)
      }
      const tables = await getTablesFromDb(key)
      if (!tables) {
        return null
      }
      return () =>
        useTableStore.getState().add(key, tables.nodeTable, tables.edgeTable)
    }

    case 'summaries': {
      if (type === ChangeType.DELETED) {
        return () => useNetworkSummaryStore.getState().delete(key)
      }
      const summary = await getNetworkSummaryFromDb(key)
      if (!summary) {
        return null
      }
      return () => useNetworkSummaryStore.getState().add(key, summary)
    }

    case 'uiState': {
      if (type === ChangeType.DELETED) {
        return null
      }
      const ui = await getUiStateFromDb()
      if (!ui) {
        return null
      }
      return () => {
        const localUi = useUiStateStore.getState().ui
        const { networkIds } = useWorkspaceStore.getState().workspace

        // Start from local state and overlay only the shared fields. The stored
        // row no longer carries per-tab view state (see `withoutTabViewState`),
        // so there is nothing to mask — but starting from `ui` would still
        // reset this tab's panels to the defaults written there.
        const isLocalNetworkStillValid = networkIds.includes(
          localUi.activeNetworkView,
        )

        useUiStateStore.getState().setUi({
          ...localUi,
          visualStyleOptions: ui.visualStyleOptions,
          customNetworkTabName: ui.customNetworkTabName,
          tableUi: {
            ...localUi.tableUi,
            // Column widths are a property of the table, not of the viewer
            columnUiState: ui.tableUi?.columnUiState ?? {},
          },
          activeNetworkView: isLocalNetworkStillValid
            ? localUi.activeNetworkView
            : '',
        })
      }
    }

    case 'filters': {
      if (type === ChangeType.DELETED) {
        return () => useFilterStore.getState().deleteFilterConfig(key)
      }
      const filter = await getFilterFromDb(key)
      if (!filter) {
        return null
      }
      return () => useFilterStore.getState().updateFilterConfig(key, filter)
    }

    case 'opaqueAspects': {
      if (type === ChangeType.DELETED) {
        return () => useOpaqueAspectStore.getState().delete(key)
      }
      const aspectsDb = await getOpaqueAspectsFromDb(key)
      if (!aspectsDb) {
        return null
      }
      const aspectList = Object.entries(aspectsDb.aspects).map(([k, v]) => ({
        [k]: v,
      }))
      // `isUpdate: true` replaces this network's aspects instead of merging.
      // The list is the complete DB snapshot, so merging would keep an aspect
      // the other tab had just deleted.
      return () => useOpaqueAspectStore.getState().addAll(key, aspectList, true)
    }

    case 'undoStacks': {
      if (type === ChangeType.DELETED) {
        return () => useUndoStore.getState().deleteStack(key)
      }
      const stack = await getUndoRedoStackFromDb(key)
      if (!stack) {
        return null
      }
      return () => {
        useUndoStore.getState().setUndoStack(key, stack.undoRedoStack.undoStack)
        useUndoStore.getState().setRedoStack(key, stack.undoRedoStack.redoStack)
      }
    }

    default:
      return null
  }
}

/**
 * Apply another tab's IndexedDB changes to this tab's stores.
 *
 * Runs in two phases, and the split is load-bearing:
 *
 * 1. **Fetch** (async) — read every affected row. Nothing is written to a store
 *    and the suppression flag is NOT held, so this phase is invisible to the
 *    rest of the app no matter how long the reads take.
 * 2. **Apply** (synchronous) — set the suppression flag, run every prepared
 *    task, clear it. Because there is no `await` anywhere in this phase, no
 *    user interaction can interleave with it.
 *
 * Holding the flag across the reads instead (the original shape) meant every
 * local write issued during those reads was applied to Zustand but dropped
 * before IndexedDB — and `persistNetworkSlices` only diffs before/after of the
 * current `set`, so nothing recovered it later. Regression tests live in
 * `crossTabHydrationConcurrency.test.ts`.
 *
 * The flag is still required: without it, applying a peer's change would
 * re-persist it locally, minting a fresh change record that every other tab
 * would then hydrate.
 *
 * Batches are applied one at a time, in arrival order — see
 * {@link hydrateFromCrossTabChange}.
 */
const applyBatch = async (
  changes: CrossTabChange[],
  guard: { abandoned: boolean } = { abandoned: false },
): Promise<void> => {
  // --- Phase 1: fetch (async, unsuppressed) ---
  const prepared = await Promise.all(
    dedupeChanges(changes).map(async (change) => {
      try {
        return await prepareChange(change)
      } catch (err) {
        logUi.error(
          `[Hydration] Failed to read ${change.table} for key ${String(
            change.key,
          )}`,
          err,
        )
        return null
      }
    }),
  )

  const tasks = prepared.filter((task): task is ApplyTask => task !== null)
  if (tasks.length === 0) {
    return
  }

  // The queue gave up on this batch and moved on, so a later batch may already
  // have applied fresher values for these rows. Applying now would put the stale
  // ones back — the exact reordering the queue exists to prevent.
  if (guard.abandoned) {
    logUi.warn(
      `[Hydration] Dropping ${tasks.length} apply task(s) from an abandoned batch`,
    )
    return
  }

  // --- Phase 2: apply (synchronous, suppressed) ---
  setHydrating(true)
  try {
    for (const task of tasks) {
      try {
        task()
      } catch (err) {
        // One bad row must not abandon the rest of the batch.
        logUi.error('[Hydration] Failed to apply a cross-tab change', err)
      }
    }
  } finally {
    setHydrating(false)
  }
}

/**
 * Tail of the hydration queue. Never rejects — a failed batch must not stop the
 * ones behind it.
 */
let hydrationQueue: Promise<void> = Promise.resolve()

/**
 * How long a single batch may hold the queue.
 *
 * Serializing batches means one that never settles would stop cross-tab sync for
 * the lifetime of the page, silently. Reads can genuinely block for a while — an
 * `open()` issued while another tab's `deleteDatabase` is pending waits for that
 * delete — so this is set well above any legitimate wait and only fires on a real
 * wedge.
 */
export const HYDRATION_BATCH_TIMEOUT_MS = 30_000

/**
 * Apply another tab's IndexedDB changes, one batch at a time.
 *
 * The apply phase of {@link applyBatch} is synchronous, which orders the changes
 * WITHIN a batch but says nothing about ordering BETWEEN batches. Left
 * unserialized, two batches overlap in their async fetch phases, and since every
 * `prepareChange` re-reads the row's current value rather than applying the
 * change's delta, the batch that started earlier holds the staler read. If it
 * also happens to contain a slow row (a `cyNetworks` read deserializes up to
 * `maxNetworkElementsThreshold` elements) it finishes last and overwrites the
 * newer value with the stale one. Nothing corrects that afterwards: the store
 * now disagrees with IndexedDB until the next change to the same row, and a
 * local edit in between persists the stale value back out to every other tab.
 *
 * Queueing costs nothing in the common case — `dedupeChanges` collapses each
 * row to one read, so a batch that waits is also a batch that got cheaper.
 *
 * Each batch's turn is bounded by {@link HYDRATION_BATCH_TIMEOUT_MS}: a queue is
 * only an improvement if one wedged batch cannot take every later one down with
 * it. An abandoned batch is not merely skipped — it is marked, so if its reads do
 * eventually resolve it drops its apply tasks instead of writing values that a
 * later batch has already superseded.
 */
export const hydrateFromCrossTabChange = async (
  changes: CrossTabChange[],
): Promise<void> => {
  hydrationQueue = hydrationQueue.then(async () => {
    const guard = { abandoned: false }
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([
        applyBatch(changes, guard),
        new Promise<void>((resolve) => {
          timer = setTimeout(() => {
            guard.abandoned = true
            logUi.error(
              `[Hydration] A batch did not finish within ${HYDRATION_BATCH_TIMEOUT_MS}ms; ` +
                'giving up on it so later changes still hydrate',
            )
            resolve()
          }, HYDRATION_BATCH_TIMEOUT_MS)
        }),
      ])
    } catch (err) {
      logUi.error('[Hydration] Batch failed', err)
    } finally {
      clearTimeout(timer)
    }
  })
  return hydrationQueue
}
