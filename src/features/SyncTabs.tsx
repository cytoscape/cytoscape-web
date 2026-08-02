import type { IDatabaseChange } from 'dexie-observable/api'
import { ReactElement, useEffect } from 'react'
import { useHref } from 'react-router-dom'

import { getDb } from '../data/db'
import { useMessageStore } from '../data/hooks/stores/MessageStore'
import { useWorkspaceStore } from '../data/hooks/stores/WorkspaceStore'
import { logUi } from '../debug'
import { MessageSeverity } from '../models/MessageModel'
import { getTabId } from '@/data/tabState/tabId'
import { hydrateFromCrossTabChange } from '@/data/sync/crossTabHydration'
import {
  isCrossTabSyncReady,
  onCrossTabSyncReady,
} from '@/data/sync/crossTabSyncGate'
import {
  onCrossTabSyncFailed,
  reportSyncListenerFailure,
} from '@/data/sync/crossTabSyncHealth'
import {
  DATABASE_DELETED,
  handleDatabaseDeleted,
  isOwnResetAnnouncement,
  UI_EVENTS_CHANNEL,
} from '@/data/db/lifecycle'

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
 * Tables whose primary key IS a network id, so a change to one is relevant only
 * when this tab is showing that network.
 *
 * Listed explicitly rather than inferred as "everything not workspace-wide": a
 * table added later with some other key shape would silently be compared
 * against `currentNetworkId` and hydrate — or not — for the wrong reason. Every
 * name here has a matching case in `prepareChange`.
 */
const NETWORK_KEYED_TABLES = new Set([
  'cyNetworks',
  'cyTables',
  'cyVisualStyles',
  'cyNetworkViews',
  'viewSelections',
  'opaqueAspects',
  'undoStacks',
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
  if (!NETWORK_KEYED_TABLES.has(change.table)) {
    // Not classified above, so nothing here knows what its key means. Treating
    // it as network-keyed would compare an unrelated key against the current
    // network id, which is a coin toss; hydration has no case for it anyway.
    return false
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
  const addMessage = useMessageStore((state) => state.addMessage)

  useEffect(() => {
    // The listener is attached after an await, so an unmount that happens
    // before getDb() resolves must prevent the subscription entirely —
    // otherwise StrictMode's mount/unmount/mount cycle leaks a listener on
    // every dev load.
    let cancelled = false
    let dbInstance: any = null

    // Changes seen before app-shell initialization finishes. Held rather than
    // dropped so a change written after init's read still lands.
    //
    // A Map keyed by table+key rather than an array: initialization can take
    // seconds, and a peer dragging a node during it produces a change every
    // 300ms. Hydration dedupes by row too, but only after this buffer has held
    // every one of them — unbounded growth in the one window where the tab is
    // already under load. Insertion order is preserved, and re-setting an
    // existing key keeps its position, so release order is unchanged.
    let buffered = new Map<string, IDatabaseChange>()

    const hydrate = (changes: IDatabaseChange[]): void => {
      const relevant = changes.filter(isRelevantToThisTab)
      if (relevant.length > 0) {
        void hydrateFromCrossTabChange(relevant)
      }
    }

    const releaseBuffer = (): void => {
      if (buffered.size === 0) {
        return
      }
      const pending = [...buffered.values()]
      buffered = new Map()
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
        for (const change of foreign) {
          buffered.set(`${change.table}:${String(change.key)}`, change)
        }
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

    initDbListener().catch((e) => {
      logUi.error(
        `[${SyncTabsAction.name}]: Failed to initialize db listener`,
        e,
      )
      // Nothing retries this, so the tab is non-syncing for its whole life.
      // Reported rather than only logged: the user cannot tell a tab that is
      // not listening from a sibling tab that has made no changes.
      reportSyncListenerFailure()
    })

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

  useEffect(() => {
    // The copy lives here, not in `crossTabSyncHealth`: that module is in the
    // data layer and must not own user-facing text.
    //
    // `persistent`, because this is a condition rather than an event. A stale
    // tab stays stale, and a warning that auto-hides after five seconds tells
    // nobody anything. The only fix is a reload, so the message says so.
    return onCrossTabSyncFailed(() => {
      addMessage({
        message:
          'This tab is no longer receiving changes made in your other ' +
          'Cytoscape Web tabs. Reload it to reconnect — otherwise edits you ' +
          'make here may overwrite theirs.',
        severity: MessageSeverity.WARNING,
        persistent: true,
      })
    })
  }, [addMessage])

  return <></>
}
