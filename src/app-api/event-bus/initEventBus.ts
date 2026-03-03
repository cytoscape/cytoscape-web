// src/app-api/event-bus/initEventBus.ts
// Internal — never exposed via Module Federation.
// Sets up Zustand subscriptions that bridge store mutations to window CustomEvents.

import { useTableStore } from '../../data/hooks/stores/TableStore'
import { useViewModelStore } from '../../data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../data/hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import { IdType } from '../../models/IdType'
import { Table } from '../../models/TableModel'
import { VisualPropertyName } from '../../models/VisualStyleModel/VisualPropertyName'
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
 * Returns the IDs of rows that were added, deleted, or mutated between two
 * table snapshots. An empty array indicates a schema-only change.
 */
function detectChangedRowIds(curr: Table, prev: Table): IdType[] {
  const changed: IdType[] = []
  for (const [id, row] of curr.rows) {
    if (prev.rows.get(id) !== row) changed.push(id)
  }
  for (const id of prev.rows.keys()) {
    if (!curr.rows.has(id)) changed.push(id)
  }
  return changed
}

// ── Public init function ──────────────────────────────────────────────────────

/**
 * Wires Zustand store subscriptions to window CustomEvents.
 * Must be called once, after store hydration, in src/init.tsx.
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
        if (!prevSet.has(id)) dispatchCyWebEvent('network:created', { networkId: id })
      }
      for (const id of prevSet) {
        if (!currSet.has(id)) dispatchCyWebEvent('network:deleted', { networkId: id })
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
      dispatchCyWebEvent('selection:changed', { networkId, selectedNodes, selectedEdges })
    },
    { equalityFn: selectionEqual },
  )

  // --- style:changed ---
  // VisualStyleStore does not use subscribeWithSelector, so we use the
  // basic two-argument subscribe form (state, prevState).
  useVisualStyleStore.subscribe((curr, prev) => {
    for (const networkId of Object.keys(curr.visualStyles) as IdType[]) {
      const style = curr.visualStyles[networkId]
      const prevStyle = prev.visualStyles[networkId]
      if (prevStyle === style) continue
      for (const property of Object.keys(style) as VisualPropertyName[]) {
        if (style[property] !== prevStyle?.[property]) {
          dispatchCyWebEvent('style:changed', { networkId, property })
        }
      }
    }
  })

  // --- data:changed ---
  useTableStore.subscribe(
    (state) => state.tables,
    (curr, prev) => {
      for (const networkId of Object.keys(curr) as IdType[]) {
        const tables = curr[networkId]
        const prevTables = prev[networkId]
        if (prevTables === undefined) continue
        const tableTypes = ['node', 'edge'] as const
        for (const tableType of tableTypes) {
          const currTable = tableType === 'node' ? tables.nodeTable : tables.edgeTable
          const prevTable = tableType === 'node' ? prevTables.nodeTable : prevTables.edgeTable
          if (currTable === prevTable) continue
          const rowIds = detectChangedRowIds(currTable, prevTable)
          dispatchCyWebEvent('data:changed', { networkId, tableType, rowIds })
        }
      }
    },
  )
}
