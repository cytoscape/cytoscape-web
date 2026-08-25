import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GraphObjectType } from '../../models/NetworkModel'
import NetworkFn from '../../models/NetworkModel'
import { createTable } from '../../models/TableModel/impl/inMemoryTable'
import { useFilterStore } from './stores/FilterStore'
import { useNetworkStore } from './stores/NetworkStore'
import { useNetworkSummaryStore } from './stores/NetworkSummaryStore'
import { useTableStore } from './stores/TableStore'
import { useUiStateStore } from './stores/UiStateStore'
import { useUndoStore } from './stores/UndoStore'
import { useViewModelStore } from './stores/ViewModelStore'
import { useVisualStyleStore } from './stores/VisualStyleStore'
import { useWorkspaceStore } from './stores/WorkspaceStore'
import { useDeleteCyNetwork } from './useDeleteCyNetwork'

// Mock the database module so store persistence does not hit IndexedDB
vi.mock('../db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../db')>()
  const mocked: Record<string, any> = { ...actual }
  for (const key of Object.keys(actual)) {
    if (
      key.startsWith('put') ||
      key.startsWith('delete') ||
      key.startsWith('clear')
    ) {
      mocked[key] = vi.fn().mockResolvedValue(undefined)
    }
  }
  return mocked
})

vi.mock('./navigation/useUrlNavigation', () => ({
  useUrlNavigation: () => ({
    navigateToNetwork: vi.fn(),
  }),
}))

const seedNetwork = (networkId: string): void => {
  const network = NetworkFn.createNetworkFromLists(
    networkId,
    [{ id: 'n1' }, { id: 'n2' }],
    [{ id: 'e1', s: 'n1', t: 'n2' }],
  )
  useNetworkStore.getState().add(network)
  useTableStore
    .getState()
    .add(
      networkId,
      createTable(`${networkId}-nodes`),
      createTable(`${networkId}-edges`),
    )
  useUndoStore.getState().addStack(networkId, { undoStack: [], redoStack: [] })
  useWorkspaceStore.getState().addNetworkIds(networkId)
}

describe('useDeleteCyNetwork', () => {
  beforeEach(() => {
    act(() => {
      useNetworkStore.getState().deleteAll()
      useTableStore.getState().deleteAll()
      useViewModelStore.getState().deleteAll()
      useVisualStyleStore.getState().deleteAll()
      useNetworkSummaryStore.getState().deleteAll()
      useUndoStore.getState().deleteAllStacks()
      useWorkspaceStore.getState().deleteAllNetworks()
      useWorkspaceStore.getState().setCurrentNetworkId('')
      useUiStateStore.getState().setActiveNetworkView('')
    })
  })

  it('deletes a network from every store, leaving other networks intact', () => {
    act(() => {
      seedNetwork('net-1')
      seedNetwork('net-2')
    })
    const { result } = renderHook(() => useDeleteCyNetwork())

    act(() => {
      result.current.deleteNetwork('net-1', { navigate: false })
    })

    expect(useNetworkStore.getState().networks.has('net-1')).toBe(false)
    expect(useTableStore.getState().tables['net-1']).toBeUndefined()
    expect(useUndoStore.getState().undoRedoStacks['net-1']).toBeUndefined()
    expect(useWorkspaceStore.getState().workspace.networkIds).toEqual(['net-2'])
    // Untouched sibling
    expect(useNetworkStore.getState().networks.has('net-2')).toBe(true)
    expect(useTableStore.getState().tables['net-2']).toBeDefined()
  })

  // REVIEW.md R2-13: with navigate:false, currentNetworkId used to be left
  // pointing at the deleted network while other networks remained — the
  // invariant `currentNetworkId ∈ networkIds ∪ {''}` was owned by nobody.
  it('repairs currentNetworkId when the current network is deleted without navigation (regression: R2-13)', () => {
    act(() => {
      seedNetwork('net-1')
      seedNetwork('net-2')
      useWorkspaceStore.getState().setCurrentNetworkId('net-1')
    })
    const { result } = renderHook(() => useDeleteCyNetwork())

    act(() => {
      result.current.deleteNetwork('net-1', { navigate: false })
    })

    const { workspace } = useWorkspaceStore.getState()
    expect(workspace.currentNetworkId).toBe('net-2')
  })

  it('does not switch the current network when a NON-current network is deleted', () => {
    act(() => {
      seedNetwork('net-1')
      seedNetwork('net-2')
      useWorkspaceStore.getState().setCurrentNetworkId('net-2')
    })
    const { result } = renderHook(() => useDeleteCyNetwork())

    act(() => {
      result.current.deleteNetwork('net-1', { navigate: false })
    })

    expect(useWorkspaceStore.getState().workspace.currentNetworkId).toBe(
      'net-2',
    )
  })

  // REVIEW.md P2 (orphaned per-network state): visualStyleOptions and
  // columnUiState entries are PERSISTED via putUiStateToDb, so orphans
  // accumulated in IndexedDB forever; FilterStore search indexes leaked
  // in memory for the rest of the session.
  it('cleans persisted per-network UI state (regression: orphaned UiState entries)', () => {
    act(() => {
      seedNetwork('net-1')
      useUiStateStore.getState().setVisualStyleOptions('net-1', {
        visualEditorProperties: {
          nodeSizeLocked: false,
          arrowColorMatchesEdge: false,
        },
      } as any)
    })
    expect(
      useUiStateStore.getState().ui.visualStyleOptions['net-1'],
    ).toBeDefined()

    const { result } = renderHook(() => useDeleteCyNetwork())
    act(() => {
      result.current.deleteNetwork('net-1', { navigate: false })
    })

    expect(
      useUiStateStore.getState().ui.visualStyleOptions['net-1'],
    ).toBeUndefined()
  })

  it('cleans in-memory search indexes (regression: FilterStore leak)', () => {
    act(() => {
      seedNetwork('net-1')
      useFilterStore
        .getState()
        .setIndex('net-1', GraphObjectType.NODE, { fake: 'index' })
    })
    expect(
      useFilterStore.getState().getIndex('net-1', GraphObjectType.NODE),
    ).toBeDefined()

    const { result } = renderHook(() => useDeleteCyNetwork())
    act(() => {
      result.current.deleteNetwork('net-1', { navigate: false })
    })

    expect(
      useFilterStore.getState().getIndex('net-1', GraphObjectType.NODE),
    ).toBeUndefined()
  })

  it('deleteAllNetworks clears every per-network slice everywhere', () => {
    act(() => {
      seedNetwork('net-1')
      seedNetwork('net-2')
      useFilterStore
        .getState()
        .setIndex('net-1', GraphObjectType.NODE, { fake: 'index' })
      useUiStateStore.getState().setVisualStyleOptions('net-1', {
        visualEditorProperties: {
          nodeSizeLocked: false,
          arrowColorMatchesEdge: false,
        },
      } as any)
    })

    const { result } = renderHook(() => useDeleteCyNetwork())
    act(() => {
      result.current.deleteAllNetworks()
    })

    expect(useNetworkStore.getState().networks.size).toBe(0)
    expect(useWorkspaceStore.getState().workspace.networkIds).toEqual([])
    expect(useWorkspaceStore.getState().workspace.currentNetworkId).toBe('')
    expect(useUiStateStore.getState().ui.visualStyleOptions).toEqual({})
    expect(
      useFilterStore.getState().getIndex('net-1', GraphObjectType.NODE),
    ).toBeUndefined()
  })
})
