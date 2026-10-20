/**
 * The Delete key's command: the selected nodes and edges go as ONE undo
 * entry, and one undo brings everything back. Runs against the real stores
 * and the real undo stack.
 */
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { IdType } from '../../models/IdType'
import NetworkFn from '../../models/NetworkModel'
import { UndoCommandType } from '../../models/StoreModel/UndoStoreModel'
import TableFn from '../../models/TableModel'
import ViewModelFn from '../../models/ViewModel'
import { createVisualStyle } from '../../models/VisualStyleModel/impl/visualStyleFnImpl'
import {
  EdgeVisualPropertyName,
  NodeVisualPropertyName,
} from '../../models/VisualStyleModel/VisualPropertyName'
import { useNetworkStore } from '../hooks/stores/NetworkStore'
import { useTableStore } from '../hooks/stores/TableStore'
import { useUndoStore } from '../hooks/stores/UndoStore'
import { useViewModelStore } from '../hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../hooks/stores/WorkspaceStore'
import { useUndoStack } from '../hooks/useUndoStack'
import { deleteSelectedElements } from './deleteSelection'

// Keep store persistence away from IndexedDB
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

const NET: IdType = 'delete-selection-net'

// n1 —e1— n2 —e2— n3 —e3— n4
const POSITIONS = new Map<IdType, [number, number]>([
  ['n1', [10, 20]],
  ['n2', [30, 40]],
  ['n3', [50, 60]],
  ['n4', [70, 80]],
])

const seed = (): void => {
  const network = NetworkFn.createNetworkFromLists(
    NET,
    [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }, { id: 'n4' }],
    [
      { id: 'e1', s: 'n1', t: 'n2' },
      { id: 'e2', s: 'n2', t: 'n3' },
      { id: 'e3', s: 'n3', t: 'n4' },
    ],
  )
  act(() => {
    useNetworkStore.getState().add(network)
    useTableStore
      .getState()
      .add(
        NET,
        TableFn.createTable(`${NET}-nodes`),
        TableFn.createTable(`${NET}-edges`),
      )
    useViewModelStore
      .getState()
      .add(NET, ViewModelFn.createViewModel(network, NET))
    useViewModelStore.getState().updateNodePositions(NET, POSITIONS)
    useVisualStyleStore.getState().add(NET, createVisualStyle())
  })
}

const select = (nodeIds: IdType[], edgeIds: IdType[]): void => {
  act(() => {
    useViewModelStore.getState().exclusiveSelect(NET, nodeIds, edgeIds)
  })
}

const ids = (): { nodes: IdType[]; edges: IdType[] } => {
  const network = useNetworkStore.getState().networks.get(NET)!
  return {
    nodes: network.nodes.map((node) => node.id).sort(),
    edges: network.edges.map((edge) => edge.id).sort(),
  }
}

const view = () => useViewModelStore.getState().getViewModel(NET)!
const undoStack = () => useUndoStore.getState().undoRedoStacks[NET]?.undoStack

const ALL = {
  nodes: ['n1', 'n2', 'n3', 'n4'],
  edges: ['e1', 'e2', 'e3'],
}

describe('deleteSelectedElements', () => {
  beforeEach(() => {
    act(() => {
      useUndoStore.getState().deleteAllStacks()
      useNetworkStore.getState().deleteAll()
      useTableStore.getState().deleteAll()
      useViewModelStore.getState().deleteAll()
      useVisualStyleStore.getState().deleteAll()
      useWorkspaceStore.getState().setCurrentNetworkId(NET)
    })
    seed()
  })

  it('deletes the selected nodes, their edges and the selected edges, as one undo step', () => {
    // e1 goes with n1; e3 is selected on its own
    select(['n1'], ['e3'])
    let deleted = false
    act(() => {
      deleted = deleteSelectedElements(NET)
    })

    expect(deleted).toBe(true)
    expect(ids()).toEqual({ nodes: ['n2', 'n3', 'n4'], edges: ['e2'] })
    expect(view().selectedNodes).toEqual([])
    expect(view().selectedEdges).toEqual([])
    expect(Object.keys(view().nodeViews).sort()).toEqual(['n2', 'n3', 'n4'])
    expect(Object.keys(view().edgeViews)).toEqual(['e2'])

    expect(undoStack()).toHaveLength(1)
    expect(undoStack()![0].undoCommand).toBe(UndoCommandType.DELETE_ELEMENTS)
    expect(undoStack()![0].description).toBe('Delete 1 Node and 1 Edge')
    expect(useWorkspaceStore.getState().workspace.networkModified[NET]).toBe(
      true,
    )
  })

  it('is undone in one step, views and positions included, and redone', () => {
    const { result: undo } = renderHook(() => useUndoStack())
    select(['n1'], ['e3'])
    act(() => {
      deleteSelectedElements(NET)
    })

    act(() => {
      undo.current.undoLastEdit()
    })
    expect(ids()).toEqual(ALL)
    expect(Object.keys(view().edgeViews).sort()).toEqual(ALL.edges)
    expect(view().nodeViews.n1).toMatchObject({ x: 10, y: 20 })
    expect(undoStack()).toHaveLength(0)

    act(() => {
      undo.current.redoLastEdit()
    })
    expect(ids()).toEqual({ nodes: ['n2', 'n3', 'n4'], edges: ['e2'] })

    // And back once more: the redo put the same entry on the undo stack
    act(() => {
      undo.current.undoLastEdit()
    })
    expect(ids()).toEqual(ALL)
  })

  it('restores an edge selected together with its own node', () => {
    const { result: undo } = renderHook(() => useUndoStack())
    select(['n1'], ['e1'])
    act(() => {
      deleteSelectedElements(NET)
    })
    expect(ids()).toEqual({ nodes: ['n2', 'n3', 'n4'], edges: ['e2', 'e3'] })
    expect(undoStack()![0].description).toBe('Delete 1 Node and 1 Edge')

    act(() => {
      undo.current.undoLastEdit()
    })
    expect(ids()).toEqual(ALL)
  })

  it('deletes edges only, and nodes only', () => {
    const { result: undo } = renderHook(() => useUndoStack())

    select([], ['e1', 'e2'])
    act(() => {
      deleteSelectedElements(NET)
    })
    expect(ids()).toEqual({ nodes: ALL.nodes, edges: ['e3'] })
    expect(undoStack()![0].description).toBe('Delete 2 Edges')
    act(() => {
      undo.current.undoLastEdit()
    })
    expect(ids()).toEqual(ALL)

    select(['n4'], [])
    act(() => {
      deleteSelectedElements(NET)
    })
    expect(ids()).toEqual({ nodes: ['n1', 'n2', 'n3'], edges: ['e1', 'e2'] })
    expect(undoStack()![0].description).toBe('Delete 1 Node')
    act(() => {
      undo.current.undoLastEdit()
    })
    expect(ids()).toEqual(ALL)
  })

  it('removes the bypasses of everything it deletes, and the undo restores them', () => {
    const { result: undo } = renderHook(() => useUndoStack())
    act(() => {
      const { setBypass } = useVisualStyleStore.getState()
      setBypass(NET, NodeVisualPropertyName.NodeBackgroundColor, ['n1'], '#f00')
      // e1 goes with n1, e3 is selected
      setBypass(NET, EdgeVisualPropertyName.EdgeLineColor, ['e1', 'e3'], '#0f0')
    })
    const bypass = (vp: NodeVisualPropertyName | EdgeVisualPropertyName) =>
      useVisualStyleStore.getState().visualStyles[NET][vp].bypassMap

    select(['n1'], ['e3'])
    act(() => {
      deleteSelectedElements(NET)
    })
    expect(bypass(NodeVisualPropertyName.NodeBackgroundColor).size).toBe(0)
    expect(bypass(EdgeVisualPropertyName.EdgeLineColor).size).toBe(0)

    act(() => {
      undo.current.undoLastEdit()
    })
    expect(bypass(NodeVisualPropertyName.NodeBackgroundColor).get('n1')).toBe(
      '#f00',
    )
    expect(
      [...bypass(EdgeVisualPropertyName.EdgeLineColor).keys()].sort(),
    ).toEqual(['e1', 'e3'])
  })

  it('does nothing without a selection, a network or a view', () => {
    let deleted = true
    act(() => {
      deleted = deleteSelectedElements(NET)
    })
    expect(deleted).toBe(false)
    expect(deleteSelectedElements('no-such-network')).toBe(false)
    expect(ids()).toEqual(ALL)
    expect(undoStack() ?? []).toHaveLength(0)
  })

  it('ignores selected ids that are no longer in the network', () => {
    select(['gone'], ['also-gone'])
    let deleted = true
    act(() => {
      deleted = deleteSelectedElements(NET)
    })
    expect(deleted).toBe(false)
    expect(undoStack() ?? []).toHaveLength(0)
  })
})
