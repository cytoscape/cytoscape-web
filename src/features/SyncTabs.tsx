import type { IDatabaseChange } from 'dexie-observable/api'
import { ReactElement, useEffect } from 'react'
import { useHref } from 'react-router-dom'

import { getDb } from '../data/db'
import { useWorkspaceStore } from '../data/hooks/stores/WorkspaceStore'
import { logUi } from '../debug'
import { getTabId } from '../boot/tabId'
import { hydrateFromCrossTabChange } from './crossTabHydration'
import { isCrossTabSyncReady, onCrossTabSyncReady } from './crossTabSyncGate'
import {
  DATABASE_DELETED,
  handleDatabaseDeleted,
  isOwnResetAnnouncement,
  UI_EVENTS_CHANNEL,
} from './databaseLifecycle'

/**
 * Tables holding workspace-wide state, relevant to a tab whatever network it is
 * showing: the network list, the network names in the browser panel, and the
 * shared slice of UI state.
 */
const WORKSPACE_WIDE_TABLES = new Set([
  'workspace',
  'uiState',
  'summaries',
  // `filters` rows are keyed by FILTER NAME (`db.filters.put({ id: name })`),
  // not by network id, so the per-network check below can never match one and
  // filter changes would never reach the hydration case at all.
  'filters',
])

/**
 * Should this tab apply a given change?
 *
 * Per-network tables are only hydrated for the network this tab is displaying.
 * Data for other networks is deliberately left stale: it can be large (up to
 * `maxNetworkElementsThreshold` elements), and switching to a network re-reads
 * it from IndexedDB anyway — `WorkspaceEditor`'s network-swap effect calls
 * `loadCurrentNetworkById`, which loads from the DB rather than from the store.
 *
 * This is a per-change filter, not a batch-level gate. Gating the whole batch
 * meant one `summaries` entry (which always matches) dragged every other
 * network's tables and node positions along with it.
 */
const isRelevantToThisTab = (change: IDatabaseChange): boolean => {
  if (WORKSPACE_WIDE_TABLES.has(change.table)) {
    return true
  }
  const { currentNetworkId } = useWorkspaceStore.getState().workspace
  return change.key === currentNetworkId
}

/**
 * Keeps this tab's stores in step with edits made in other tabs.
 *
 * ## Why there is no BroadcastChannel here
 *
 * dexie-observable's `db.on('changes')` already fires in every tab for every
 * change: `readChanges()` replays all `_changes` rows above this tab's own
 * revision, regardless of which tab wrote them. Relaying those changes over a
 * second BroadcastChannel transport was therefore redundant, and actively
 * harmful — tab B received tab A's change directly, re-posted it, and tab A
 * hydrated its own write (clobbering its local selection). It also lost
 * changes for any tab that was frozen or bfcached while a message was sent,
 * because BroadcastChannel has no replay and the `_changes` log does.
 *
 * So: one transport (`db.on('changes')`), and origin is read from
 * `change.source`, which `stampTransactionSource` in `src/data/db/index.ts`
 * sets to the writing tab's id.
 *
 * `cyweb-ui-events` remains a BroadcastChannel because it carries liveness
 * signals rather than data — nothing to replay, and it must arrive before the
 * database it refers to is gone.
 */
export const SyncTabsAction = (): ReactElement => {
  useEffect(() => {
    // The listener is attached after an await, so an unmount that happens
    // before getDb() resolves must prevent the subscription entirely —
    // otherwise StrictMode's mount/unmount/mount cycle leaks a listener on
    // every dev load.
    let cancelled = false
    let dbInstance: any = null

    // Changes seen before app-shell initialization finishes. Held rather than
    // dropped so a change written after init's read still lands; hydration
    // dedupes by row, so a long buffer collapses to one read per row.
    let buffered: IDatabaseChange[] = []

    const hydrate = (changes: IDatabaseChange[]): void => {
      const relevant = changes.filter(isRelevantToThisTab)
      if (relevant.length > 0) {
        void hydrateFromCrossTabChange(relevant)
      }
    }

    const releaseBuffer = (): void => {
      if (buffered.length === 0) {
        return
      }
      const pending = buffered
      buffered = []
      hydrate(pending)
    }

    const changesListener = (changes: IDatabaseChange[]): void => {
      const tabId = getTabId()

      // Drop this tab's own writes. No isHydrating() check is needed: writes
      // made while hydrating are stamped with our own id too, so they are
      // filtered here by construction.
      const foreign = changes.filter((change) => change.source !== tabId)
      if (foreign.length === 0) {
        return
      }

      if (!isCrossTabSyncReady()) {
        buffered.push(...foreign)
        return
      }

      hydrate(foreign)
    }

    const unsubscribeGate = onCrossTabSyncReady(releaseBuffer)

    const initDbListener = async (): Promise<void> => {
      const db = await getDb()
      if (cancelled) {
        return
      }
      dbInstance = db
      dbInstance.on('changes', changesListener)
    }

    initDbListener().catch((e) =>
      logUi.error(
        `[${SyncTabsAction.name}]: Failed to initialize db listener`,
        e,
      ),
    )

    return () => {
      cancelled = true
      unsubscribeGate()
      if (dbInstance !== null) {
        dbInstance.on('changes').unsubscribe(changesListener)
      }
    }
  }, [])

  // Root path with the router basename applied, so a deployment under a
  // sub-path does not reload to the wrong origin root.
  const rootHref = useHref('/')

  useEffect(() => {
    const channel = new BroadcastChannel(UI_EVENTS_CHANNEL)

    channel.onmessage = (event) => {
      if (event.data?.type !== DATABASE_DELETED) {
        return
      }
      // The resetting tab hears its own announcement: BroadcastChannel excludes
      // only the posting channel object, and `announceDatabaseReset` opens a
      // separate one. Acting on it would close our connection mid-delete.
      if (isOwnResetAnnouncement(event.data)) {
        return
      }
      void handleDatabaseDeleted(channel, () => {
        window.location.assign(rootHref)
      })
    }

    return () => {
      channel.close()
    }
  }, [rootHref])

  return <></>
}
