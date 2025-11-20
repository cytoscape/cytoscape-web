import { IdType } from '../../IdType'
import { getFunction, RendererFunctionState, setFunction } from './rendererFunctionImpl'

const createDefaultState = (): RendererFunctionState => {
  return {
    rendererFunctions: new Map<string, Map<string, Function>>(),
    rendererFunctionsByNetworkId: new Map<
      IdType,
      Map<string, Map<string, Function>>
    >(),
  }
}

describe('RendererFunctionImpl', () => {
  describe('setFunction', () => {
    it('should set a function for a renderer', () => {
      const state = createDefaultState()
      const rendererName = 'renderer-1'
      const functionName = 'function-1'
      const mockFn = () => 'test'

      const result = setFunction(state, rendererName, functionName, mockFn)

      expect(result.rendererFunctions.has(rendererName)).toBe(true)
      expect(
        result.rendererFunctions.get(rendererName)?.has(functionName),
      ).toBe(true)
      expect(result).not.toBe(state) // Immutability check
      expect(state.rendererFunctions.has(rendererName)).toBe(false) // Original unchanged
    })

    it('should set function for a specific network', () => {
      const state = createDefaultState()
      const networkId: IdType = 'network-1'
      const rendererName = 'renderer-1'
      const functionName = 'function-1'
      const mockFn = () => 'test'

      const result = setFunction(
        state,
        rendererName,
        functionName,
        mockFn,
        networkId,
      )

      expect(result.rendererFunctionsByNetworkId.has(networkId)).toBe(true)
      expect(
        result.rendererFunctionsByNetworkId
          .get(networkId)
          ?.get(rendererName)
          ?.get(functionName),
      ).toBe(mockFn)
      expect(result).not.toBe(state) // Immutability check
    })

    it('should set function for both global and network-specific', () => {
      const state = createDefaultState()
      const networkId: IdType = 'network-1'
      const rendererName = 'renderer-1'
      const functionName = 'function-1'
      const mockFn = () => 'test'

      const result = setFunction(
        state,
        rendererName,
        functionName,
        mockFn,
        networkId,
      )

      // Should be in both places
      expect(
        result.rendererFunctions.get(rendererName)?.get(functionName),
      ).toBe(mockFn)
      expect(
        result.rendererFunctionsByNetworkId
          .get(networkId)
          ?.get(rendererName)
          ?.get(functionName),
      ).toBe(mockFn)
    })
  })

  describe('getFunction', () => {
    it('should get a function from global renderer functions', () => {
      const state = createDefaultState()
      const rendererName = 'renderer-1'
      const functionName = 'function-1'
      const mockFn = () => 'test'

      const stateWithFunction = setFunction(
        state,
        rendererName,
        functionName,
        mockFn,
      )

      const retrievedFn = getFunction(
        stateWithFunction,
        rendererName,
        functionName,
      )

      expect(retrievedFn).toBe(mockFn)
    })

    it('should get a function from network-specific renderer functions', () => {
      const state = createDefaultState()
      const networkId: IdType = 'network-1'
      const rendererName = 'renderer-1'
      const functionName = 'function-1'
      const mockFn = () => 'test'

      const stateWithFunction = setFunction(
        state,
        rendererName,
        functionName,
        mockFn,
        networkId,
      )

      const retrievedFn = getFunction(
        stateWithFunction,
        rendererName,
        functionName,
        networkId,
      )

      expect(retrievedFn).toBe(mockFn)
    })

    it('should return undefined if function does not exist', () => {
      const state = createDefaultState()

      const retrievedFn = getFunction(
        state,
        'non-existent',
        'non-existent',
      )

      expect(retrievedFn).toBeUndefined()
    })
  })

  describe('immutability', () => {
    it('should not mutate the original state', () => {
      const original = createDefaultState()
      const originalRendererFunctions = original.rendererFunctions
      const originalByNetworkId = original.rendererFunctionsByNetworkId

      const result = setFunction(
        original,
        'renderer-1',
        'function-1',
        () => 'test',
        'network-1',
      )

      // Verify original is unchanged
      expect(original.rendererFunctions).toBe(originalRendererFunctions)
      expect(original.rendererFunctionsByNetworkId).toBe(originalByNetworkId)
      expect(original.rendererFunctions.has('renderer-1')).toBe(false)
      expect(original.rendererFunctionsByNetworkId.has('network-1')).toBe(
        false,
      )
    })
  })
})

