/**
 * Regression tests for #857: undoing Delete Selected Nodes/Edges must bring
 * back the node and edge views (positions included), not only the topology.
 *
 * These run the real delete hooks and the real undo stack against the real
 * stores. The delete cores used to read `viewModels[networkId].nodeViews`, but
 * `viewModels[networkId]` is a `NetworkView[]`, so no view was ever captured
 * and the undo restored nodes the renderer then had no position for.
 */
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { IdType } from '../../models/IdType'
import NetworkFn from '../../models/NetworkModel'
import TableFn from '../../models/TableModel'
import { NetworkView } from '../../models/ViewModel'
import ViewModelFn from '../../models/ViewModel'
import { createVisualStyle } from '../../models/VisualStyleModel/impl/visualStyleFnImpl'
import {
  EdgeVisualPropertyName,
  NodeVisualPropertyName,
} from '../../models/VisualStyleModel/VisualPropertyName'
import { useNetworkStore } from './stores/NetworkStore'
import { useTableStore } from './stores/TableStore'
import { useUndoStore } from './stores/UndoStore'
import { useViewModelStore } from './stores/ViewModelStore'
import { useVisualStyleStore } from './stores/VisualStyleStore'
import { useWorkspaceStore } from './stores/WorkspaceStore'
import { useDeleteEdges } from './useDeleteEdges'
import { useDeleteNodes } from './useDeleteNodes'
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

const NETWORK_ID: IdType = 'delete-undo-net'

// n1 —e1— n2 —e2— n3
const POSITIONS = new Map<IdType, [number, number]>([
  ['n1', [100, 200]],
  ['n2', [-50, 75]],
  ['n3', [300, -400]],
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
    [
      { id: 'e1', s: 'n1', t: 'n2' },
      { id: 'e2', s: 'n2', t: 'n3' },
    ],
  )
  const nodeTable = TableFn.createTable(`${NETWORK_ID}-nodes`)
  const edgeTable = TableFn.createTable(`${NETWORK_ID}-edges`)
  // A network normally carries more than one view (the renderer registers a
  // second node-link view); the restore must reach every one of them.
  const primary = ViewModelFn.createViewModel(network, NETWORK_ID)
  const secondary = ViewModelFn.createViewModel(network, NETWORK_ID)

  act(() => {
    useNetworkStore.getState().add(network)
    useTableStore.getState().add(NETWORK_ID, nodeTable, edgeTable)
    useViewModelStore.getState().add(NETWORK_ID, primary)
    useViewModelStore.getState().add(NETWORK_ID, secondary)
    useViewModelStore.getState().updateNodePositions(NETWORK_ID, POSITIONS)
  })
}

describe('undo of node and edge deletion (#857)', () => {
  beforeEach(() => {
    act(() => {
      useUndoStore.getState().deleteAllStacks()
      useNetworkStore.getState().deleteAll()
      useTableStore.getState().deleteAll()
      useViewModelStore.getState().deleteAll()
      useWorkspaceStore.getState().setCurrentNetworkId(NETWORK_ID)
    })
    seed()
  })

  it('restores every node view at its original position after deleting all nodes', () => {
    const before = views().map(positionsOf)
    expect(views()).toHaveLength(2)
    expect(before[0]).toEqual({
      n1: [100, 200],
      n2: [-50, 75],
      n3: [300, -400],
    })

    const { result: deleteHook } = renderHook(() => useDeleteNodes())
    const { result: undoHook } = renderHook(() => useUndoStack())

    act(() => {
      deleteHook.current.deleteNodes(NETWORK_ID, ['n1', 'n2', 'n3'])
    })
    expect(Object.keys(views()[0].nodeViews)).toHaveLength(0)
    expect(Object.keys(views()[0].edgeViews)).toHaveLength(0)

    act(() => {
      undoHook.current.undoLastEdit()
    })

    const network = useNetworkStore.getState().networks.get(NETWORK_ID)!
    expect(network.nodes).toHaveLength(3)
    expect(network.edges).toHaveLength(2)
    expect(views().map(positionsOf)).toEqual(before)
    views().forEach((view) => {
      expect(Object.keys(view.edgeViews).sort()).toEqual(['e1', 'e2'])
    })
  })

  it('restores a single deleted node at its original position', () => {
    const { result: deleteHook } = renderHook(() => useDeleteNodes())
    const { result: undoHook } = renderHook(() => useUndoStack())

    act(() => {
      deleteHook.current.deleteNodes(NETWORK_ID, ['n3'])
    })
    act(() => {
      undoHook.current.undoLastEdit()
    })

    views().forEach((view) => {
      expect(view.nodeViews.n3).toMatchObject({ x: 300, y: -400 })
      expect(view.edgeViews.e2).toBeDefined()
    })
  })

  it('restores the edge views after undoing an edge deletion', () => {
    const { result: deleteHook } = renderHook(() => useDeleteEdges())
    const { result: undoHook } = renderHook(() => useUndoStack())

    act(() => {
      deleteHook.current.deleteEdges(NETWORK_ID, ['e1', 'e2'])
    })
    expect(Object.keys(views()[0].edgeViews)).toHaveLength(0)

    act(() => {
      undoHook.current.undoLastEdit()
    })

    expect(
      useNetworkStore.getState().networks.get(NETWORK_ID)!.edges,
    ).toHaveLength(2)
    views().forEach((view) => {
      expect(Object.keys(view.edgeViews).sort()).toEqual(['e1', 'e2'])
    })
  })

  // Undo restores the deleted elements' bypasses into the visual property's
  // bypass map; it must not replace that map and drop the bypasses of the
  // elements that were never deleted.
  describe('bypasses through undo and redo', () => {
    const bypassOf = (vp: NodeVisualPropertyName | EdgeVisualPropertyName) =>
      Object.fromEntries(
        useVisualStyleStore.getState().visualStyles[NETWORK_ID][vp].bypassMap,
      )

    beforeEach(() => {
      act(() => {
        const store = useVisualStyleStore.getState()
        store.deleteAll()
        store.add(NETWORK_ID, createVisualStyle())
      })
    })

    it('of a node deletion: undo keeps the others, redo drops the node again', () => {
      act(() => {
        const { setBypass } = useVisualStyleStore.getState()
        setBypass(
          NETWORK_ID,
          NodeVisualPropertyName.NodeBackgroundColor,
          ['n1'],
          '#f00',
        )
        setBypass(
          NETWORK_ID,
          NodeVisualPropertyName.NodeBackgroundColor,
          ['n3'],
          '#00f',
        )
      })
      const { result: deleteHook } = renderHook(() => useDeleteNodes())
      const { result: undoHook } = renderHook(() => useUndoStack())

      act(() => {
        deleteHook.current.deleteNodes(NETWORK_ID, ['n1'])
      })
      act(() => {
        undoHook.current.undoLastEdit()
      })

      expect(bypassOf(NodeVisualPropertyName.NodeBackgroundColor)).toEqual({
        n1: '#f00',
        n3: '#00f',
      })

      // Redo drops the deleted node's bypass again, and only that one
      act(() => {
        undoHook.current.redoLastEdit()
      })
      expect(bypassOf(NodeVisualPropertyName.NodeBackgroundColor)).toEqual({
        n3: '#00f',
      })
    })

    it('of an edge deletion: undo keeps the others, redo drops the edge again', () => {
      act(() => {
        const { setBypass } = useVisualStyleStore.getState()
        setBypass(
          NETWORK_ID,
          EdgeVisualPropertyName.EdgeLineColor,
          ['e1'],
          '#0f0',
        )
        setBypass(
          NETWORK_ID,
          EdgeVisualPropertyName.EdgeLineColor,
          ['e2'],
          '#ff0',
        )
      })
      const { result: deleteHook } = renderHook(() => useDeleteEdges())
      const { result: undoHook } = renderHook(() => useUndoStack())

      act(() => {
        deleteHook.current.deleteEdges(NETWORK_ID, ['e1'])
      })
      act(() => {
        undoHook.current.undoLastEdit()
      })

      expect(bypassOf(EdgeVisualPropertyName.EdgeLineColor)).toEqual({
        e1: '#0f0',
        e2: '#ff0',
      })

      act(() => {
        undoHook.current.redoLastEdit()
      })
      expect(bypassOf(EdgeVisualPropertyName.EdgeLineColor)).toEqual({
        e2: '#ff0',
      })
    })
  })
})
