import NetworkFn from '../../NetworkModel'
import { NetworkSummary } from '../../NetworkSummaryModel'
import { createNetworkSummary } from '../../NetworkSummaryModel/impl/networkSummaryImpl'
import { LayoutAlgorithm } from '../LayoutAlgorithm'
import { LayoutEngine } from '../LayoutEngine'
import {
  defAlgorithm,
  defHierarchicalAlgorithm,
  ELE_THRESHOLD,
  getDefaultLayout,
  getLayout,
  LayoutEngines,
} from './layoutSelection'

// Mock the isHCX function to avoid dependency issues
jest.mock('../../../features/HierarchyViewer/utils/hierarchyUtil', () => ({
  isHCX: jest.fn(() => false),
}))

// Mock Cosmos layout to avoid dependency issues with @cosmograph/cosmos
jest.mock('./Cosmos/cosmosLayout', () => ({
  CosmosLayout: {
    name: 'cosmos',
    algorithms: {
      cosmos: { name: 'cosmos' },
    },
  },
}))

// to run these: npx jest src/models/LayoutModel/impl/layoutSelection.test.ts

describe('layoutSelection', () => {
  describe('LayoutEngines', () => {
    it('should be an array of layout engines', () => {
      expect(Array.isArray(LayoutEngines)).toBe(true)
      expect(LayoutEngines.length).toBeGreaterThan(0)
    })

    it('should contain engines with name property', () => {
      LayoutEngines.forEach((engine: LayoutEngine) => {
        expect(engine.name).toBeDefined()
        expect(typeof engine.name).toBe('string')
      })
    })
  })

  describe('defAlgorithm', () => {
    it('should be defined', () => {
      expect(defAlgorithm).toBeDefined()
    })

    it('should have a name property', () => {
      expect(defAlgorithm.name).toBeDefined()
      expect(typeof defAlgorithm.name).toBe('string')
    })
  })

  describe('defHierarchicalAlgorithm', () => {
    it('should be defined', () => {
      expect(defHierarchicalAlgorithm).toBeDefined()
    })

    it('should have a name property', () => {
      expect(defHierarchicalAlgorithm.name).toBeDefined()
      expect(typeof defHierarchicalAlgorithm.name).toBe('string')
    })
  })

  describe('ELE_THRESHOLD', () => {
    it('should be set to 1000', () => {
      expect(ELE_THRESHOLD).toBe(1000)
    })

    it('should be a number', () => {
      expect(typeof ELE_THRESHOLD).toBe('number')
    })
  })

  describe('getLayout', () => {
    it('should return undefined for unknown engine', () => {
      const result = getLayout('unknownEngine', 'someAlgorithm')

      expect(result).toBeUndefined()
    })

    it('should return undefined for unknown algorithm', () => {
      if (LayoutEngines.length > 0) {
        const engineName = LayoutEngines[0].name
        const result = getLayout(engineName, 'unknownAlgorithm')

        expect(result).toBeUndefined()
      }
    })

    it('should return algorithm for valid engine and algorithm', () => {
      if (LayoutEngines.length > 0) {
        const engine = LayoutEngines[0]
        const engineName = engine.name
        const algorithmNames = Object.keys(engine.algorithms)

        if (algorithmNames.length > 0) {
          const algorithmName = algorithmNames[0]
          const result = getLayout(engineName, algorithmName)

          expect(result).toBeDefined()
          expect(result?.name).toBe(algorithmName)
        }
      }
    })
  })

  describe('getDefaultLayout', () => {
    it('should return undefined for networks larger than threshold', () => {
      const network = NetworkFn.createNetwork('test-network')
      const summary = createNetworkSummary({
        networkId: network.id,
        name: 'Test',
      })
      const numElements = 2000
      const threshold = 1000

      const result = getDefaultLayout(summary, numElements, threshold)

      expect(result).toBeUndefined()
    })

    it('should return layout for small networks', () => {
      const network = NetworkFn.createNetwork('test-network')
      const summary = createNetworkSummary({
        networkId: network.id,
        name: 'Test',
      })
      const numElements = 100
      const threshold = 1000

      const result = getDefaultLayout(summary, numElements, threshold)

      expect(result).toBeDefined()
      if (result) {
        expect(result.engineName).toBeDefined()
        expect(result.algorithmName).toBeDefined()
      }
    })

    it('should return grid layout for networks at threshold', () => {
      const network = NetworkFn.createNetwork('test-network')
      const summary = createNetworkSummary({
        networkId: network.id,
        name: 'Test',
      })
      const numElements = ELE_THRESHOLD
      const threshold = 1000

      const result = getDefaultLayout(summary, numElements, threshold)

      expect(result).toBeDefined()
      if (result) {
        expect(result.algorithmName).toBe('grid')
      }
    })

    it('should return layout for networks above threshold but below max threshold', () => {
      const network = NetworkFn.createNetwork('test-network')
      const summary = createNetworkSummary({
        networkId: network.id,
        name: 'Test',
      })
      const numElements = 1500
      const maxThreshold = 2000

      const result = getDefaultLayout(summary, numElements, maxThreshold)

      expect(result).toBeDefined()
    })

    it('should return undefined when numElements exceeds maxNetworkElementsThreshold', () => {
      const network = NetworkFn.createNetwork('test-network')
      const summary = createNetworkSummary({
        networkId: network.id,
        name: 'Test',
      })
      const numElements = 1500
      const maxThreshold = 1000

      const result = getDefaultLayout(summary, numElements, maxThreshold)

      expect(result).toBeUndefined()
    })
  })
})
