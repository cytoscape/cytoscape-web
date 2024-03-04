import { useNetworkStore } from '../../src/store/NetworkStore'
import { renderHook, act } from '@testing-library/react'
import { Network } from '../../src/models/NetworkModel'
import { enableMapSet } from 'immer'

enableMapSet()
/**
 * Tests for all functions in useNetworkStore
 *
 */
describe('Unite tests for all functions in useNetworkStore', () => {
  let network1: Network

  beforeEach(() => {
    network1 = {
      id: 'network1',
      nodes: [],
      edges: [],
    }
  })

  it('should add a network', async () => {
    const { result } = renderHook(() => useNetworkStore())

    act(() => {
      result.current.add(network1)
    })
    const count = result.current.networks.size

    // Assert
    expect(count).toBe(1)
    expect(result.current.networks.get('network1')).toEqual(network1)
  })

  
})
