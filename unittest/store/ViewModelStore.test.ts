import { renderHook, act } from '@testing-library/react'
import { useViewModelStore } from '../../src/store/ViewModelStore'
import { NetworkView } from '../../src/models/ViewModel'
import { IdType } from '../../src/models/IdType'
import { waitSeconds } from '../../src/utils/wait-seconds'

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
    expect(result.current.viewModels[mockId]).toEqual(mockNetworkView)
    await waitSeconds(0.5)
  })

  it('should update selected nodes and edges', () => {
    const { result } = renderHook(() => useViewModelStore())
    const selectedNodes = ['node1', 'node2']
    const selectedEdges = ['edge1', 'edge2']
    act(() => {
      result.current.exclusiveSelect(mockId, selectedNodes, selectedEdges)
    })
    expect(result.current.viewModels[mockId].selectedNodes.length).toEqual(
      2,
    )
    expect(result.current.viewModels[mockId].selectedNodes).toEqual(
      selectedNodes,
    )
    expect(result.current.viewModels[mockId].selectedEdges).toEqual(
      selectedEdges,
    )
  })

  // Add more tests for other actions here
})
