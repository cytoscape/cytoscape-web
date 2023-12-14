import { renderHook, act } from '@testing-library/react'
import { useViewModelStore } from '../../src/store/ViewModelStore'
import { NetworkView } from '../../src/models/ViewModel'
import { IdType } from '../../src/models/IdType'
import { enableMapSet } from 'immer'

enableMapSet()

describe('useViewModelStore', () => {
  let mockNetworkView: NetworkView
  let mockId: IdType

  beforeEach(() => {
    mockNetworkView = {
      id: 'mockId',
      values: new Map(),
      nodeViews: {
        node1: { id: 'node1', x: 0, y: 0, values: new Map() },
        node2: {
          id: 'node2',
          x: 100,
          y: 101,
          values: new Map(),
        },
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
      selectedNodes: ['node1'],
      selectedEdges: ['edge1'],
    }
    mockId = 'mockId'
  })

  it('should add a network view', async () => {
    const { result } = renderHook(() => useViewModelStore())
    act(() => {
      result.current.add(mockId, mockNetworkView)
    })

    const viewList: NetworkView[] = result.current.viewModels[mockId]
    expect(viewList.length).toEqual(1)
    const firstView = viewList[0]
    expect(firstView).toEqual(mockNetworkView)
  })

  it('should update selected nodes and edges', async () => {
    const { result } = renderHook(() => useViewModelStore())
    const selectedNodes = ['node1', 'node2']
    const selectedEdges = ['edge1', 'edge2']
    act(() => {
      result.current.exclusiveSelect(mockId, selectedNodes, selectedEdges)
    })
    expect(result.current.viewModels[mockId][0].selectedNodes.length).toEqual(
      2,
    )
    expect(result.current.viewModels[mockId][0].selectedNodes).toEqual(
      selectedNodes,
    )
    expect(result.current.viewModels[mockId][0].selectedEdges).toEqual(
      selectedEdges,
    )
  })

  it('should update selected nodes additively', async () => {
    const { result } = renderHook(() => useViewModelStore())
    const additionalNodes = ['node3', 'node4']
    act(() => {
      result.current.additiveSelect(mockId, additionalNodes)
    })
    expect(result.current.viewModels[mockId][0].selectedNodes.length).toEqual(4)
    expect(result.current.viewModels[mockId][0].selectedNodes).toEqual(['node1', 'node2', 'node3', 'node4'])
  })
  
  it('should unselect nodes additively', async () => {
    const { result } = renderHook(() => useViewModelStore())
    const unselectNodes = ['node1', 'node2']
    act(() => {
      result.current.additiveUnselect(mockId, unselectNodes)
    })
    expect(result.current.viewModels[mockId][0].selectedNodes.length).toEqual(2)
    expect(result.current.viewModels[mockId][0].selectedNodes).toEqual(['node3', 'node4'])
  })
  
  it('should toggle selected nodes', async () => {
    const { result } = renderHook(() => useViewModelStore())
    const toggleNodes = ['node3', 'node5']
    act(() => {
      result.current.toggleSelected(mockId, toggleNodes)
    })
    expect(result.current.viewModels[mockId][0].selectedNodes.length).toEqual(2)
    expect(result.current.viewModels[mockId][0].selectedNodes).toEqual(['node4', 'node5'])
  })
  
  // Add more tests for other functions in useViewModelStore

})
