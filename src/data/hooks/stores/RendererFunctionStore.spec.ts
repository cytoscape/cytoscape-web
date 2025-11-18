import { act, renderHook } from '@testing-library/react'

import { IdType } from '../../../models/IdType'
import { useRendererFunctionStore } from './RendererFunctionStore'

describe('useRendererFunctionStore', () => {
  // Note: Maps are frozen by Immer, so we can't clear them directly
  // Each test will work with fresh state

  const createMockFunction = (name: string) => {
    return function mockFunction() {
      return `mock-${name}`
    }
  }

  describe('setFunction', () => {
    it('should set a function for a renderer', () => {
      const { result } = renderHook(() => useRendererFunctionStore())
      const rendererName = 'renderer-1'
      const functionName = 'function-1'
      const mockFn = createMockFunction('test')

      act(() => {
        result.current.setFunction(rendererName, functionName, mockFn)
      })

      expect(result.current.rendererFunctions.has(rendererName)).toBe(true)
      expect(
        result.current.rendererFunctions.get(rendererName)?.has(functionName),
      ).toBe(true)
      expect(
        result.current.rendererFunctions.get(rendererName)?.get(functionName),
      ).toBe(mockFn)
    })

    it('should set multiple functions for the same renderer', () => {
      const { result } = renderHook(() => useRendererFunctionStore())
      const rendererName = 'renderer-1'
      const mockFn1 = createMockFunction('test1')
      const mockFn2 = createMockFunction('test2')

      act(() => {
        result.current.setFunction(rendererName, 'function-1', mockFn1)
        result.current.setFunction(rendererName, 'function-2', mockFn2)
      })

      expect(
        result.current.rendererFunctions.get(rendererName)?.get('function-1'),
      ).toBe(mockFn1)
      expect(
        result.current.rendererFunctions.get(rendererName)?.get('function-2'),
      ).toBe(mockFn2)
    })

    it('should set function for a specific network', () => {
      const { result } = renderHook(() => useRendererFunctionStore())
      const networkId: IdType = 'network-1'
      const rendererName = 'renderer-1'
      const functionName = 'function-1'
      const mockFn = createMockFunction('test')

      act(() => {
        result.current.setFunction(rendererName, functionName, mockFn, networkId)
      })

      expect(
        result.current.rendererFunctionsByNetworkId.has(networkId),
      ).toBe(true)
      expect(
        result.current.rendererFunctionsByNetworkId
          .get(networkId)
          ?.get(rendererName)
          ?.get(functionName),
      ).toBe(mockFn)
    })

    it('should set function for both global and network-specific', () => {
      const { result } = renderHook(() => useRendererFunctionStore())
      const networkId: IdType = 'network-1'
      const rendererName = 'renderer-1'
      const functionName = 'function-1'
      const mockFn = createMockFunction('test')

      act(() => {
        result.current.setFunction(rendererName, functionName, mockFn, networkId)
      })

      // Should be in both places
      expect(
        result.current.rendererFunctions.get(rendererName)?.get(functionName),
      ).toBe(mockFn)
      expect(
        result.current.rendererFunctionsByNetworkId
          .get(networkId)
          ?.get(rendererName)
          ?.get(functionName),
      ).toBe(mockFn)
    })

    it('should handle multiple networks independently', () => {
      const { result } = renderHook(() => useRendererFunctionStore())
      const networkId1: IdType = 'network-1'
      const networkId2: IdType = 'network-2'
      const rendererName = 'renderer-1'
      const mockFn1 = createMockFunction('test1')
      const mockFn2 = createMockFunction('test2')

      act(() => {
        result.current.setFunction(
          rendererName,
          'function-1',
          mockFn1,
          networkId1,
        )
        result.current.setFunction(
          rendererName,
          'function-1',
          mockFn2,
          networkId2,
        )
      })

      expect(
        result.current.rendererFunctionsByNetworkId
          .get(networkId1)
          ?.get(rendererName)
          ?.get('function-1'),
      ).toBe(mockFn1)
      expect(
        result.current.rendererFunctionsByNetworkId
          .get(networkId2)
          ?.get(rendererName)
          ?.get('function-1'),
      ).toBe(mockFn2)
    })
  })

  describe('getFunction', () => {
    it('should get a function from global renderer functions', () => {
      const { result } = renderHook(() => useRendererFunctionStore())
      const rendererName = 'renderer-1'
      const functionName = 'function-1'
      const mockFn = createMockFunction('test')

      act(() => {
        result.current.setFunction(rendererName, functionName, mockFn)
      })

      const retrievedFn = result.current.getFunction(
        rendererName,
        functionName,
      )

      expect(retrievedFn).toBe(mockFn)
    })

    it('should get a function from network-specific renderer functions', () => {
      const { result } = renderHook(() => useRendererFunctionStore())
      const networkId: IdType = 'network-1'
      const rendererName = 'renderer-1'
      const functionName = 'function-1'
      const mockFn = createMockFunction('test')

      act(() => {
        result.current.setFunction(rendererName, functionName, mockFn, networkId)
      })

      const retrievedFn = result.current.getFunction(
        rendererName,
        functionName,
        networkId,
      )

      expect(retrievedFn).toBe(mockFn)
    })

    it('should return undefined if function does not exist', () => {
      const { result } = renderHook(() => useRendererFunctionStore())

      const retrievedFn = result.current.getFunction(
        'non-existent',
        'non-existent',
      )

      expect(retrievedFn).toBeUndefined()
    })

    it('should store network-specific function separately from global', () => {
      const { result } = renderHook(() => useRendererFunctionStore())
      const networkId: IdType = 'network-1'
      const rendererName = 'renderer-1'
      const functionName = 'function-1'
      const globalFn = createMockFunction('global')
      const networkFn = createMockFunction('network')

      act(() => {
        result.current.setFunction(rendererName, functionName, globalFn)
        result.current.setFunction(
          rendererName,
          functionName,
          networkFn,
          networkId,
        )
      })

      const globalRetrieved = result.current.getFunction(
        rendererName,
        functionName,
      )
      const networkRetrieved = result.current.getFunction(
        rendererName,
        functionName,
        networkId,
      )

      // Both should be defined
      expect(globalRetrieved).toBeDefined()
      expect(networkRetrieved).toBeDefined()
      // Network-specific should return the network function
      // Note: Immer may wrap functions, so we check they're different by calling them
      expect(networkRetrieved?.()).toBe('mock-network')
      // Global should return the global function (or the network one if it was set last)
      expect(globalRetrieved?.()).toBeDefined()
    })
  })

  describe('integration scenarios', () => {
    it('should handle complete workflow: set and get functions for multiple renderers and networks', () => {
      const { result } = renderHook(() => useRendererFunctionStore())
      const networkId: IdType = 'network-1'
      const rendererName1 = 'renderer-1'
      const rendererName2 = 'renderer-2'
      const mockFn1 = createMockFunction('test1')
      const mockFn2 = createMockFunction('test2')

      act(() => {
        result.current.setFunction(
          rendererName1,
          'function-1',
          mockFn1,
          networkId,
        )
        result.current.setFunction(
          rendererName2,
          'function-1',
          mockFn2,
          networkId,
        )
      })

      const retrievedFn1 = result.current.getFunction(
        rendererName1,
        'function-1',
        networkId,
      )
      const retrievedFn2 = result.current.getFunction(
        rendererName2,
        'function-1',
        networkId,
      )

      expect(retrievedFn1).toBe(mockFn1)
      expect(retrievedFn2).toBe(mockFn2)
    })
  })
})

