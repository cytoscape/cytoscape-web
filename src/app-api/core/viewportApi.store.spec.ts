/**
 * `viewport.updateNodePositions(..., { recordUndo: true })` against the real
 * stores (#874): the entry it records must replay through `useUndoStack`, which
 * `viewportApi.test.ts` mocks away.
 */
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useNetworkStore } from '../../data/hooks/stores/NetworkStore'
import { useTableStore } from '../../data/hooks/stores/TableStore'
import { useUiStateStore } from '../../data/hooks/stores/UiStateStore'
import { useUndoStore } from '../../data/hooks/stores/UndoStore'
import { useViewModelStore } from '../../data/hooks/stores/ViewModelStore'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import { useUndoStack } from '../../data/hooks/useUndoStack'
import { IdType } from '../../models/IdType'
import NetworkFn from '../../models/NetworkModel'
import TableFn from '../../models/TableModel'
import { NetworkView } from '../../models/ViewModel'
import ViewModelFn from '../../models/ViewModel'
import { viewportApi } from './viewportApi'

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

const NETWORK_ID: IdType = 'viewport-api-undo-net'

const BEFORE = new Map<IdType, [number, number]>([
  ['n1', [0, 0]],
  ['n2', [100, 0]],
])

const views = (): NetworkView[] =>
  useViewModelStore.getState().viewModels[NETWORK_ID]

const positionsOf = (view: NetworkView): Record<IdType, [number, number]> =>
  Object.fromEntries(
    Object.values(view.nodeViews).map((nv) => [nv.id, [nv.x, nv.y]]),
  )

const undoStack = () =>
  useUndoStore.getState().undoRedoStacks[NETWORK_ID]?.undoStack ?? []

describe('viewportApi.updateNodePositions undo with real stores (#874)', () => {
  beforeEach(() => {
    const network = NetworkFn.createNetworkFromLists(
      NETWORK_ID,
      [{ id: 'n1' }, { id: 'n2' }],
      [],
    )
    act(() => {
      useUndoStore.getState().deleteAllStacks()
      useNetworkStore.getState().deleteAll()
      useTableStore.getState().deleteAll()
      useViewModelStore.getState().deleteAll()
      useWorkspaceStore.getState().setCurrentNetworkId(NETWORK_ID)
      useUiStateStore.getState().setActiveNetworkView('')

      useNetworkStore.getState().add(network)
      useTableStore
        .getState()
        .add(
          NETWORK_ID,
          TableFn.createTable(`${NETWORK_ID}-nodes`),
          TableFn.createTable(`${NETWORK_ID}-edges`),
        )
      // Two views, as the renderer registers: undo must reach both
      useViewModelStore
        .getState()
        .add(NETWORK_ID, ViewModelFn.createViewModel(network, NETWORK_ID))
      useViewModelStore
        .getState()
        .add(NETWORK_ID, ViewModelFn.createViewModel(network, NETWORK_ID))
      useViewModelStore.getState().updateNodePositions(NETWORK_ID, BEFORE)
    })
  })

  it('one undo puts every node back, one redo moves them again', () => {
    const after = { n1: [10, 20], n2: [110, 20] } as Record<
      IdType,
      [number, number]
    >
    let result: ReturnType<typeof viewportApi.updateNodePositions> | undefined
    act(() => {
      result = viewportApi.updateNodePositions(NETWORK_ID, after, {
        recordUndo: true,
      })
    })
    expect(result?.success).toBe(true)
    expect(undoStack()).toHaveLength(1)

    const { result: undoHook } = renderHook(() => useUndoStack())
    act(() => {
      undoHook.current.undoLastEdit()
    })
    for (const view of views()) {
      expect(positionsOf(view)).toEqual(Object.fromEntries(BEFORE))
    }

    act(() => {
      undoHook.current.redoLastEdit()
    })
    for (const view of views()) {
      expect(positionsOf(view)).toEqual(after)
    }
  })

  it('records nothing without recordUndo', () => {
    act(() => {
      viewportApi.updateNodePositions(NETWORK_ID, { n1: [10, 20] })
    })
    expect(undoStack()).toHaveLength(0)
  })
})
