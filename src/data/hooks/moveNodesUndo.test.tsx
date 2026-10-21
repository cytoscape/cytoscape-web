/**
 * Undo and redo of a node drag (#870).
 *
 * Dragging several selected nodes together is ONE edit: a single MOVE_NODES
 * entry carries every dragged node's position, so one undo puts them all back.
 * It used to record one entry per node, so a 100-node drag needed 100 undos
 * and, with the 20-entry stack, pushed out everything before it.
 */
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { IdType } from '../../models/IdType'
import NetworkFn from '../../models/NetworkModel'
import { UndoCommandType } from '../../models/StoreModel/UndoStoreModel'
import TableFn from '../../models/TableModel'
import { NetworkView } from '../../models/ViewModel'
import ViewModelFn from '../../models/ViewModel'
import { useNetworkStore } from './stores/NetworkStore'
import { useTableStore } from './stores/TableStore'
import { useUiStateStore } from './stores/UiStateStore'
import { useUndoStore } from './stores/UndoStore'
import { useViewModelStore } from './stores/ViewModelStore'
import { useWorkspaceStore } from './stores/WorkspaceStore'
import { useUndoStack } from './useUndoStack'

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

const NETWORK_ID = 'move-undo-net'

const BEFORE = new Map<IdType, [number, number]>([
  ['n1', [0, 0]],
  ['n2', [100, 0]],
  ['n3', [200, 0]],
])
const AFTER = new Map<IdType, [number, number]>([
  ['n1', [50, 50]],
  ['n2', [150, 50]],
  ['n3', [250, 50]],
])

const views = (): NetworkView[] =>
  useViewModelStore.getState().viewModels[NETWORK_ID]

const positionsOf = (view: NetworkView): Record<IdType, [number, number]> =>
  Object.fromEntries(
    Object.values(view.nodeViews).map((nv) => [nv.id, [nv.x, nv.y]]),
  )

const seed = (): void => {
  const network = NetworkFn.createNetworkFromLists(
    NETWORK_ID,
    [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
    [],
  )
  const nodeTable = TableFn.createTable(`${NETWORK_ID}-nodes`)
  const edgeTable = TableFn.createTable(`${NETWORK_ID}-edges`)
  // The renderer registers a second view; a move must reach every one.
  const primary = ViewModelFn.createViewModel(network, NETWORK_ID)
  const secondary = ViewModelFn.createViewModel(network, NETWORK_ID)

  act(() => {
    useNetworkStore.getState().add(network)
    useTableStore.getState().add(NETWORK_ID, nodeTable, edgeTable)
    useViewModelStore.getState().add(NETWORK_ID, primary)
    useViewModelStore.getState().add(NETWORK_ID, secondary)
    useViewModelStore.getState().updateNodePositions(NETWORK_ID, AFTER)
  })
}

const stacks = () => useUndoStore.getState().undoRedoStacks[NETWORK_ID]

describe('undo of a node drag (#870)', () => {
  beforeEach(() => {
    act(() => {
      useUndoStore.getState().deleteAllStacks()
      useNetworkStore.getState().deleteAll()
      useTableStore.getState().deleteAll()
      useViewModelStore.getState().deleteAll()
      useWorkspaceStore.getState().setCurrentNetworkId(NETWORK_ID)
      useUiStateStore.getState().setActiveNetworkView('')
    })
    seed()
  })

  it('one undo moves every dragged node back, one redo moves them all forward', () => {
    const { result } = renderHook(() => useUndoStack())
    act(() => {
      result.current.postEdit(
        UndoCommandType.MOVE_NODES,
        'Move Nodes',
        [NETWORK_ID, BEFORE],
        [NETWORK_ID, AFTER],
        NETWORK_ID,
      )
    })
    expect(stacks().undoStack).toHaveLength(1)

    act(() => {
      result.current.undoLastEdit()
    })
    for (const view of views()) {
      expect(positionsOf(view)).toEqual(Object.fromEntries(BEFORE))
    }
    expect(stacks().undoStack).toHaveLength(0)
    expect(stacks().redoStack).toHaveLength(1)

    act(() => {
      result.current.redoLastEdit()
    })
    for (const view of views()) {
      expect(positionsOf(view)).toEqual(Object.fromEntries(AFTER))
    }
  })

  it('still replays a single-node entry persisted before #870', () => {
    const { result } = renderHook(() => useUndoStack())
    act(() => {
      useUndoStore.getState().setUndoStack(NETWORK_ID, [
        {
          undoCommand: UndoCommandType.MOVE_NODES,
          description: 'Move Nodes',
          undoParams: [NETWORK_ID, 'n2', [100, 0]],
          redoParams: [NETWORK_ID, 'n2', [150, 50]],
        },
      ])
    })

    act(() => {
      result.current.undoLastEdit()
    })
    expect(positionsOf(views()[0])).toEqual({
      n1: [50, 50],
      n2: [100, 0],
      n3: [250, 50],
    })

    act(() => {
      result.current.redoLastEdit()
    })
    expect(positionsOf(views()[0])).toEqual(Object.fromEntries(AFTER))
  })

  it.each([
    ['a non-numeric position', [NETWORK_ID, new Map([['n1', ['x', 0]]])]],
    ['a non-finite position', [NETWORK_ID, new Map([['n1', [NaN, 0]]])]],
    ['neither a map nor a node id', [NETWORK_ID, { n1: [0, 0] }]],
    ['a legacy entry without a position', [NETWORK_ID, 'n1', 'oops']],
  ])(
    'discards a persisted entry with %s and moves nothing',
    (_label, undoParams) => {
      const { result } = renderHook(() => useUndoStack())
      act(() => {
        useUndoStore.getState().setUndoStack(NETWORK_ID, [
          {
            undoCommand: UndoCommandType.MOVE_NODES,
            description: 'Move Nodes',
            undoParams,
            redoParams: [NETWORK_ID, AFTER],
          },
        ])
      })

      act(() => {
        result.current.undoLastEdit()
      })
      for (const view of views()) {
        expect(positionsOf(view)).toEqual(Object.fromEntries(AFTER))
      }
      expect(stacks().undoStack).toHaveLength(0)
      expect(stacks().redoStack).toHaveLength(0)
    },
  )
})
