// src/app-api/event-bus/initEventBus.ts
// Internal — never exposed via Module Federation.
// Sets up Zustand subscriptions that bridge store mutations to window CustomEvents.

import { useNetworkStore } from '../../data/hooks/stores/NetworkStore'
import { useTableStore } from '../../data/hooks/stores/TableStore'
import { useViewModelStore } from '../../data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../data/hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import { IdType } from '../../models/IdType'
import { Network } from '../../models/NetworkModel'
import { Table } from '../../models/TableModel'
import { detectChangedRowIds } from '../../models/TableModel/impl/tableDiff'
import { NetworkView } from '../../models/ViewModel'
import { VisualPropertyName } from '../../models/VisualStyleModel/VisualPropertyName'
import { CyWebEvents } from './CyWebEvents'
import { dispatchCyWebEvent } from './dispatchCyWebEvent'

// ── Private helpers ───────────────────────────────────────────────────────────

/**
 * Compares two selection snapshots by value.
 * Prevents spurious selection:changed events when the store creates a new
 * array object with identical contents (e.g., re-clicking the same node).
 */
function selectionEqual(
  a: { networkId: IdType; selectedNodes: IdType[]; selectedEdges: IdType[] },
  b: { networkId: IdType; selectedNodes: IdType[]; selectedEdges: IdType[] },
): boolean {
  if (a.networkId !== b.networkId) return false
  if (a.selectedNodes.length !== b.selectedNodes.length) return false
  if (a.selectedEdges.length !== b.selectedEdges.length) return false
  for (let i = 0; i < a.selectedNodes.length; i++) {
    if (a.selectedNodes[i] !== b.selectedNodes[i]) return false
  }
  for (let i = 0; i < a.selectedEdges.length; i++) {
    if (a.selectedEdges[i] !== b.selectedEdges[i]) return false
  }
  return true
}

/**
 * Returns the column names added and removed between two table snapshots
 * so apps can distinguish schema changes from row edits. A rename appears
 * as one added and one removed name.
 */
function detectColumnChanges(
  curr: Table,
  prev: Table,
): { addedColumns: string[]; removedColumns: string[] } {
  const currNames = new Set(curr.columns.map((c) => c.name))
  const prevNames = new Set(prev.columns.map((c) => c.name))
  return {
    addedColumns: [...currNames].filter((name) => !prevNames.has(name)),
    removedColumns: [...prevNames].filter((name) => !currNames.has(name)),
  }
}

/** Returns element IDs present in curr but not prev, and vice versa */
function diffElementIds(
  curr: Set<IdType>,
  prev: Set<IdType>,
): { added: IdType[]; removed: IdType[] } {
  return {
    added: [...curr].filter((id) => !prev.has(id)),
    removed: [...prev].filter((id) => !curr.has(id)),
  }
}

/** Node and edge IDs of a network at one point in time */
interface TopologySnapshot {
  nodes: Set<IdType>
  edges: Set<IdType>
}

/**
 * Copies the current membership of a network out of the live cytoscape store.
 *
 * Network.nodes / .edges are getters over the backing cytoscape instance, so
 * they always report the present state — they must be copied at read time to
 * be usable as a "before" value later.
 */
function snapshotTopology(network: Network): TopologySnapshot {
  return {
    nodes: new Set(network.nodes.map((node) => node.id)),
    edges: new Set(network.edges.map((edge) => edge.id)),
  }
}

/**
 * A network is loaded — readable through tableApi, elementApi and
 * viewportApi — once both its tables and at least one view are in the
 * stores. The two land in either order: WorkspaceEditor adds tables first,
 * cross-tab hydration adds the view first.
 */
function isNetworkLoaded(
  networkId: IdType,
  tables: Record<IdType, unknown>,
  viewModels: Record<IdType, NetworkView[] | undefined>,
): boolean {
  return (
    tables[networkId] !== undefined && (viewModels[networkId]?.length ?? 0) > 0
  )
}

// ── Public init function ──────────────────────────────────────────────────────

/**
 * Wires Zustand store subscriptions to window CustomEvents.
 * Must be called once, after store hydration, in src/features/AppShell.tsx.
 *
 * layout:started and layout:completed are NOT set up here — they are
 * dispatched directly from core/layoutApi.ts via dispatchCyWebEvent.
 */
export function initEventBus(): void {
  // --- network:created / network:deleted ---
  useWorkspaceStore.subscribe(
    (state) => state.workspace.networkIds,
    (curr, prev) => {
      const prevSet = new Set(prev)
      const currSet = new Set(curr)
      for (const id of currSet) {
        if (!prevSet.has(id))
          dispatchCyWebEvent('network:created', { networkId: id })
      }
      for (const id of prevSet) {
        if (!currSet.has(id))
          dispatchCyWebEvent('network:deleted', { networkId: id })
      }
    },
  )

  // --- network:switched ---
  useWorkspaceStore.subscribe(
    (state) => state.workspace.currentNetworkId,
    (networkId, previousId) => {
      if (networkId !== previousId) {
        dispatchCyWebEvent('network:switched', { networkId, previousId })
      }
    },
  )

  // --- selection:changed ---
  // Watches the primary view for the current network. Uses selectionEqual to
  // avoid spurious events when the store creates a new array with the same
  // contents (e.g., re-clicking an already-selected node).
  useViewModelStore.subscribe(
    (state) => {
      const networkId = useWorkspaceStore.getState().workspace.currentNetworkId
      const views = state.viewModels[networkId]
      const view = views?.[0]
      return {
        networkId,
        selectedNodes: view?.selectedNodes ?? [],
        selectedEdges: view?.selectedEdges ?? [],
      }
    },
    ({ networkId, selectedNodes, selectedEdges }) => {
      dispatchCyWebEvent('selection:changed', {
        networkId,
        selectedNodes,
        selectedEdges,
      })
    },
    { equalityFn: selectionEqual },
  )

  // --- style:switched + style:changed ---
  // VisualStyleStore does not use subscribeWithSelector, so we use the
  // basic two-argument subscribe form (state, prevState). Both events come
  // from one callback so their order is fixed: the coarse signal that the
  // whole style was replaced arrives before the per-property burst it causes.
  useVisualStyleStore.subscribe((curr, prev) => {
    // A style switch replaces the active style wholesale, so the loop below
    // reports it as one style:changed per differing property — up to ~60 of
    // them, with nothing saying they are one operation. This is that signal.
    for (const networkId of Object.keys(curr.styleSets) as IdType[]) {
      const activeStyleId = curr.styleSets[networkId]?.activeStyleId
      const previousStyleId = prev.styleSets[networkId]?.activeStyleId
      // A network's first style set (network just registered) is covered by
      // network:created
      if (previousStyleId === undefined || activeStyleId === undefined) continue
      if (activeStyleId === previousStyleId) continue
      dispatchCyWebEvent('style:switched', {
        networkId,
        styleId: activeStyleId,
        previousStyleId,
      })
    }

    for (const networkId of Object.keys(curr.visualStyles) as IdType[]) {
      const style = curr.visualStyles[networkId]
      const prevStyle = prev.visualStyles[networkId]
      // A brand-new style (network just created) is covered by network:created
      if (prevStyle === undefined || prevStyle === style) continue
      for (const property of Object.keys(style) as VisualPropertyName[]) {
        if (style[property] !== prevStyle?.[property]) {
          dispatchCyWebEvent('style:changed', { networkId, property })
        }
      }
    }
  })

  // --- network:changed ---
  // Fires when nodes/edges are added to or removed from an existing
  // network. Creation and deletion are excluded — network:created and
  // network:deleted (workspace subscriptions above) cover those.
  //
  // Networks are cytoscape-backed and mutate in place, so neither the Network
  // object nor the networks Map changes identity on a topology edit, and
  // neither can be diffed against its own past self. The subscription
  // therefore watches topologyVersions (which the store bumps on every
  // topology mutation) and diffs against snapshots kept here.
  const topologySnapshots = new Map<IdType, TopologySnapshot>()
  for (const [networkId, network] of useNetworkStore.getState().networks) {
    topologySnapshots.set(networkId, snapshotTopology(network))
  }
  useNetworkStore.subscribe(
    (state) => state.topologyVersions,
    (curr, prev) => {
      // Bookkeeping first, dispatch second. Store subscribers and window event
      // listeners both run synchronously, so a listener that mutates the
      // network store re-enters this callback from inside the dispatch. While
      // that nested call runs, `curr` and `networks` here are already stale —
      // acting on them afterwards would clobber the snapshots the nested call
      // just recorded. Nothing below touches the store until the loop, the
      // cleanup, and every snapshot write are final.
      const pending: Array<CyWebEvents['network:changed']> = []
      const { networks } = useNetworkStore.getState()

      for (const [networkId, version] of curr) {
        if (prev.get(networkId) === version) continue
        const network = networks.get(networkId)
        if (network === undefined) continue

        const snapshot = snapshotTopology(network)
        const prevSnapshot = topologySnapshots.get(networkId)
        topologySnapshots.set(networkId, snapshot)
        // First sighting of this network: it was just added to the store, and
        // network:created covers that. Nothing to diff against yet.
        if (prevSnapshot === undefined) continue

        const nodeDiff = diffElementIds(snapshot.nodes, prevSnapshot.nodes)
        const edgeDiff = diffElementIds(snapshot.edges, prevSnapshot.edges)
        if (
          nodeDiff.added.length === 0 &&
          nodeDiff.removed.length === 0 &&
          edgeDiff.added.length === 0 &&
          edgeDiff.removed.length === 0
        ) {
          continue
        }
        pending.push({
          networkId,
          addedNodeIds: nodeDiff.added,
          removedNodeIds: nodeDiff.removed,
          addedEdgeIds: edgeDiff.added,
          removedEdgeIds: edgeDiff.removed,
        })
      }

      // Drop snapshots of networks that left the store. A retained snapshot
      // would be diffed against a later network reusing the same id.
      for (const networkId of topologySnapshots.keys()) {
        if (!curr.has(networkId)) topologySnapshots.delete(networkId)
      }

      for (const detail of pending) {
        dispatchCyWebEvent('network:changed', detail)
      }
    },
  )

  // --- data:changed ---
  useTableStore.subscribe(
    (state) => state.tables,
    (curr, prev) => {
      for (const networkId of Object.keys(curr) as IdType[]) {
        const tables = curr[networkId]
        const prevTables = prev[networkId]
        // First landing of this network's tables: that is a load, not an
        // edit, and network:loaded (below) covers it.
        if (prevTables === undefined) continue
        const tableTypes = ['node', 'edge'] as const
        for (const tableType of tableTypes) {
          const currTable =
            tableType === 'node' ? tables.nodeTable : tables.edgeTable
          const prevTable =
            tableType === 'node' ? prevTables.nodeTable : prevTables.edgeTable
          if (currTable === prevTable) continue
          const rowIds = detectChangedRowIds(currTable, prevTable)
          const { addedColumns, removedColumns } = detectColumnChanges(
            currTable,
            prevTable,
          )
          dispatchCyWebEvent('data:changed', {
            networkId,
            tableType,
            rowIds,
            addedColumns,
            removedColumns,
          })
        }
      }
    },
  )

  // --- network:loaded ---
  // Workspace networks are loaded lazily: after a page reload only the
  // summaries are in the stores, and a network's tables and view land the
  // first time it becomes current (WorkspaceEditor.loadCurrentNetworkById).
  // network:switched fires as soon as currentNetworkId changes, before that
  // async load resolves, so an app that reads the tables on the switch gets
  // APP1 and nothing else tells it to look again. This is that signal.
  //
  // "Loaded" means tables AND a view are present, in whichever order they
  // arrive, so both stores are watched and each check reads the other store.
  // The set is seeded with what is already in the stores at init so that
  // nothing hydrated before initEventBus() ran (URL imports during boot)
  // fires later just because another network's tables changed.
  const loadedNetworks = new Set<IdType>()
  const checkLoaded = (): void => {
    const { tables } = useTableStore.getState()
    const { viewModels } = useViewModelStore.getState()
    const pending: IdType[] = []
    for (const networkId of Object.keys(tables) as IdType[]) {
      if (loadedNetworks.has(networkId)) continue
      if (!isNetworkLoaded(networkId, tables, viewModels)) continue
      loadedNetworks.add(networkId)
      pending.push(networkId)
    }
    // A deleted network leaves the set so the same id loaded again (a
    // cross-tab re-add, or an undone delete) fires again.
    for (const networkId of loadedNetworks) {
      if (tables[networkId] === undefined) loadedNetworks.delete(networkId)
    }
    // Bookkeeping before dispatch: a listener that loads or deletes a network
    // re-enters this callback synchronously.
    for (const networkId of pending) {
      dispatchCyWebEvent('network:loaded', { networkId })
    }
  }
  const seedTables = useTableStore.getState().tables
  const seedViews = useViewModelStore.getState().viewModels
  for (const networkId of Object.keys(seedTables) as IdType[]) {
    if (isNetworkLoaded(networkId, seedTables, seedViews)) {
      loadedNetworks.add(networkId)
    }
  }
  useTableStore.subscribe((state) => state.tables, checkLoaded)
  useViewModelStore.subscribe((state) => state.viewModels, checkLoaded)
}
