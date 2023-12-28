import { renderHook, act } from '@testing-library/react'
import { useViewModelStore } from '../../src/store/ViewModelStore'
import { NetworkView } from '../../src/models/ViewModel'
import { IdType } from '../../src/models/IdType'
import { enableMapSet } from 'immer'

enableMapSet()

describe('useViewModelStore', () => {
  let mockNetworkView: NetworkView
  let mockNetworkView2: NetworkView
  let mockNetworkView3: NetworkView
  let networkModelId: IdType

  beforeEach(() => {
    networkModelId = 'networkModelId1'
    mockNetworkView = {
      id: networkModelId,
      values: new Map(),
      nodeViews: {
        node1: { id: 'node1', x: 0, y: 0, values: new Map() },
        node2: {
          id: 'node2',
          x: 100,
          y: 101,
          values: new Map(),
        },
        node3: { id: 'node3', x: 200, y: 201, values: new Map() },
        node4: { id: 'node4', x: 300, y: 301, values: new Map() },
        node5: { id: 'node5', x: 400, y: 401, values: new Map() },
      },
      edgeViews: {
        edge1: {
          id: 'edge1',
          values: new Map(),
        },
        edge2: {
          id: 'edge2',
          values: new Map(),
        },
      },
      selectedNodes: [],
      selectedEdges: [],
    }

    mockNetworkView2 = {
      id: networkModelId,
      type: 'circlePacking',
      values: new Map(),
      nodeViews: {
        node6: { id: 'node6', x: 500, y: 501, values: new Map() },
        node7: { id: 'node7', x: 600, y: 601, values: new Map() },
        node8: { id: 'node8', x: 700, y: 701, values: new Map() },
        node9: { id: 'node9', x: 800, y: 801, values: new Map() },
        node10: { id: 'node10', x: 900, y: 901, values: new Map() },
      },
      edgeViews: {
        edge3: { id: 'edge3', values: new Map() },
        edge4: { id: 'edge4', values: new Map() },
      },
      selectedNodes: [],
      selectedEdges: [],
    }
    
    mockNetworkView3 = {
      id: networkModelId,
      type: 'nodeLink',
      values: new Map(),
      nodeViews: {
        node6: { id: 'node6', x: 500, y: 501, values: new Map() },
        node7: { id: 'node7', x: 600, y: 601, values: new Map() },
        node8: { id: 'node8', x: 700, y: 701, values: new Map() },
      },
      edgeViews: {
        edge3: { id: 'edge3', values: new Map() },
        edge4: { id: 'edge4', values: new Map() },
      },
      selectedNodes: [],
      selectedEdges: [],
    }
  })

  it('should return undefined if no viewModel exists for a given id', () => {
    // Arrange
    const id = 'nonExistentId'

    let view: NetworkView | undefined

    // Act
    const { result } = renderHook(() => useViewModelStore())
    act(() => {
      view = result.current.getViewModel(id)
    })

    // Assert
    expect(view).toBeUndefined()
  })

  it('should add network views', async () => {
    const { result } = renderHook(() => useViewModelStore())

    let primaryView: NetworkView | undefined

    // Add two network views
    act(() => {
      result.current.add(networkModelId, mockNetworkView)
      result.current.add(networkModelId, mockNetworkView2)
      result.current.add(networkModelId, mockNetworkView3)
      primaryView = result.current.getViewModel(networkModelId)
    })

    const viewList: NetworkView[] = result.current.viewModels[networkModelId]
    expect(viewList.length).toEqual(3)
    const firstView = viewList[0]
    expect(firstView).toEqual(primaryView)
    expect(primaryView).toEqual(mockNetworkView)
    expect(primaryView?.viewId).toEqual(`${networkModelId}-nodeLink-1`)

    const secondView = viewList[1]
    expect(secondView).toEqual(mockNetworkView2)
    expect(secondView?.viewId).toEqual(`${networkModelId}-circlePacking-1`)
    
    const lastView = viewList[2]
    expect(lastView).toEqual(mockNetworkView3)
    expect(lastView?.viewId).toEqual(`${networkModelId}-nodeLink-2`)
  })

  it('should update selected nodes and edges', async () => {
    const { result } = renderHook(() => useViewModelStore())
    const selectedNodes = ['node1', 'node2']
    const selectedEdges = ['edge1', 'edge2']
    act(() => {
      result.current.exclusiveSelect(
        networkModelId,
        selectedNodes,
        selectedEdges,
      )
    })
    expect(
      result.current.viewModels[networkModelId][0].selectedNodes.length,
    ).toEqual(2)
    expect(result.current.viewModels[networkModelId][0].selectedNodes).toEqual(
      selectedNodes,
    )
    expect(result.current.viewModels[networkModelId][0].selectedEdges).toEqual(
      selectedEdges,
    )
  })

  it('should update selected nodes additively', async () => {
    const { result } = renderHook(() => useViewModelStore())

    const firstSelectedNodes = ['node1', 'node2']
    const additionalNodes = ['node3', 'node4']

    act(() => {
      result.current.additiveSelect(networkModelId, firstSelectedNodes)
      result.current.additiveSelect(networkModelId, additionalNodes)
    })
    expect(result.current.viewModels[networkModelId][0].selectedNodes).toEqual([
      'node1',
      'node2',
      'node3',
      'node4',
    ])
  })

  it('should unselect nodes additively', async () => {
    const { result } = renderHook(() => useViewModelStore())
    const originalSelectedNodes = ['node1', 'node2', 'node5']
    const unselectNodes = ['node1', 'node5']
    act(() => {
      result.current.exclusiveSelect(networkModelId, originalSelectedNodes, [])
      result.current.additiveUnselect(networkModelId, unselectNodes)
    })
    expect(
      result.current.viewModels[networkModelId][0].selectedNodes.length,
    ).toEqual(1)
    expect(result.current.viewModels[networkModelId][0].selectedNodes).toEqual([
      'node2',
    ])
  })

  it('should toggle selected nodes', async () => {
    const { result } = renderHook(() => useViewModelStore())
    const originalSelectedNodes = ['node1', 'node2', 'node5']
    const toggleNodes = ['node3', 'node5']
    act(() => {
      // Select 1, 2, 5
      result.current.exclusiveSelect(networkModelId, originalSelectedNodes, [])
      // Toggle 3, 5, and 1, 3, 2 should remain selected
      result.current.toggleSelected(networkModelId, toggleNodes)
    })
    expect(
      result.current.viewModels[networkModelId][0].selectedNodes.length,
    ).toEqual(3)
    expect(result.current.viewModels[networkModelId][0].selectedNodes).toEqual([
      'node1',
      'node2',
      'node3',
    ])
  })

  it('should set node position', async () => {
    const { result } = renderHook(() => useViewModelStore())
    const newPosition: [number, number] = [100, 200]

    act(() => {
      result.current.setNodePosition(networkModelId, 'node1', newPosition)
    })

    expect(
      result.current.getViewModel(networkModelId)?.nodeViews.node1.x,
    ).toEqual(newPosition[0])
    expect(
      result.current.getViewModel(networkModelId)?.nodeViews.node1.y,
    ).toEqual(newPosition[1])
  })

  it('should update node positions', async () => {
    const { result } = renderHook(() => useViewModelStore())
    const newPositions = new Map()
    newPositions.set('node1', [100, 200])
    newPositions.set('node2', [300, 400])

    act(() => {
      result.current.updateNodePositions(networkModelId, newPositions)
    })

    expect(
      result.current.getViewModel(networkModelId)?.nodeViews.node1.x,
    ).toEqual(100)
    expect(
      result.current.getViewModel(networkModelId)?.nodeViews.node1.y,
    ).toEqual(200)
    expect(
      result.current.getViewModel(networkModelId)?.nodeViews.node2.x,
    ).toEqual(300)
    expect(
      result.current.getViewModel(networkModelId)?.nodeViews.node2.y,
    ).toEqual(400)
  })

  it('should delete objects', async () => {
    const { result } = renderHook(() => useViewModelStore())

    act(() => {
      result.current.deleteObjects(networkModelId, ['node1', 'edge1'])
    })

    expect(
      result.current.getViewModel(networkModelId)?.nodeViews.node1,
    ).toBeUndefined()
    expect(
      result.current.getViewModel(networkModelId)?.nodeViews.node2.id,
    ).toEqual('node2')
    expect(
      result.current.getViewModel(networkModelId)?.edgeViews.edge1,
    ).toBeUndefined()
  })

  it('should delete a network view list', async () => {
    const { result } = renderHook(() => useViewModelStore())

    await act(async () => {
      result.current.delete(networkModelId)
    })

    expect(result.current.getViewModel(networkModelId)).toBeUndefined()
  })

  it('should delete all network views', async () => {
    const { result } = renderHook(() => useViewModelStore())

    await act(async () => {
      result.current.deleteAll()
    })

    expect(result.current.viewModels).toEqual({})
  })
})
