/**
 * Regression tests for #857 through the App API, against the real stores.
 *
 * `elementApi.test.ts` mocks every store and the delete cores, so it cannot see
 * what the cores capture. `deleteNodes` builds each returned node's `position`
 * from the captured node views, and its undo entry restores them; both were
 * empty because the cores read the per-network view LIST as a single view.
 */
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useNetworkStore } from '../../data/hooks/stores/NetworkStore'
import { useTableStore } from '../../data/hooks/stores/TableStore'
import { useUndoStore } from '../../data/hooks/stores/UndoStore'
import { useViewModelStore } from '../../data/hooks/stores/ViewModelStore'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import { useUndoStack } from '../../data/hooks/useUndoStack'
import { IdType } from '../../models/IdType'
import NetworkFn from '../../models/NetworkModel'
import TableFn from '../../models/TableModel'
import ViewModelFn from '../../models/ViewModel'
import { elementApi } from './elementApi'

vi.mock('../../data/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../data/db')>()
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

const NETWORK_ID: IdType = 'element-api-delete-net'

const primaryView = () => useViewModelStore.getState().viewModels[NETWORK_ID][0]

describe('elementApi.deleteNodes with real stores (#857)', () => {
  beforeEach(() => {
    const network = NetworkFn.createNetworkFromLists(
      NETWORK_ID,
      [{ id: 'n1' }, { id: 'n2' }],
      [{ id: 'e1', s: 'n1', t: 'n2' }],
    )
    act(() => {
      useUndoStore.getState().deleteAllStacks()
      useNetworkStore.getState().deleteAll()
      useTableStore.getState().deleteAll()
      useViewModelStore.getState().deleteAll()
      useWorkspaceStore.getState().setCurrentNetworkId(NETWORK_ID)

      useNetworkStore.getState().add(network)
      useTableStore
        .getState()
        .add(
          NETWORK_ID,
          TableFn.createTable(`${NETWORK_ID}-nodes`),
          TableFn.createTable(`${NETWORK_ID}-edges`),
        )
      useViewModelStore
        .getState()
        .add(NETWORK_ID, ViewModelFn.createViewModel(network, NETWORK_ID))
      useViewModelStore.getState().updateNodePositions(
        NETWORK_ID,
        new Map<IdType, [number, number]>([
          ['n1', [12, 34]],
          ['n2', [-56, 78]],
        ]),
      )
    })
  })

  it('reports the deleted nodes at their real positions', () => {
    let result: ReturnType<typeof elementApi.deleteNodes> | undefined
    act(() => {
      result = elementApi.deleteNodes(NETWORK_ID, ['n1', 'n2'])
    })

    expect(result?.success).toBe(true)
    if (!result?.success) return
    const positions = Object.fromEntries(
      result.data.deletedNodes.map((n) => [n.id, n.position]),
    )
    expect(positions).toEqual({ n1: [12, 34], n2: [-56, 78] })
  })

  it('restores the node and edge views when the deletion is undone', () => {
    act(() => {
      elementApi.deleteNodes(NETWORK_ID, ['n1', 'n2'])
    })
    expect(Object.keys(primaryView().nodeViews)).toHaveLength(0)

    const { result: undoHook } = renderHook(() => useUndoStack())
    act(() => {
      undoHook.current.undoLastEdit()
    })

    expect(primaryView().nodeViews.n1).toMatchObject({ x: 12, y: 34 })
    expect(primaryView().nodeViews.n2).toMatchObject({ x: -56, y: 78 })
    expect(primaryView().edgeViews.e1).toBeDefined()
  })
})
