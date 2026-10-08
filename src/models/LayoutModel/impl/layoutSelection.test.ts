// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

import {
  parameterDefinitionProblem,
  parameterValueType,
} from '../../AppModel/impl/parameters'
import { LayoutEngine } from '../LayoutEngine'
import {
  defAlgorithm,
  defHierarchicalAlgorithm,
  ELE_THRESHOLD,
  getDefaultLayout,
  getLayout,
  LayoutEngines,
} from './layoutSelection'

// Mock Cosmos layout to avoid dependency issues with @cosmograph/cosmos
vi.mock('./Cosmos/cosmosLayout', () => ({
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

  describe('core algorithm editables', () => {
    // Cosmos keeps its values under `parameters.simulation` (pre-existing gap,
    // see cosmos.ts); every other core algorithm must declare editables whose
    // live value is a top-level parameter of the declared type, equal to the
    // advertised default.
    const algorithms = LayoutEngines.filter(
      (engine) => engine.name !== 'cosmos',
    ).flatMap((engine) => Object.values(engine.algorithms))

    it('are ordered arrays of the shared parameter spec', () => {
      expect(algorithms.length).toBeGreaterThan(0)
      for (const algorithm of algorithms) {
        if (algorithm.editables === undefined) continue
        expect(Array.isArray(algorithm.editables)).toBe(true)
        for (const editable of algorithm.editables) {
          expect(
            parameterDefinitionProblem(editable, 0, { strict: true }),
          ).toBeUndefined()
        }
      }
    })

    it('each name a live parameter whose value matches the default and type', () => {
      for (const algorithm of algorithms) {
        for (const editable of algorithm.editables ?? []) {
          const live = algorithm.parameters[editable.name]
          expect(live, `${algorithm.name}.${editable.name}`).toBeDefined()
          expect(live).toBe(editable.defaultValue)
          const expected = parameterValueType(editable)
          const actual =
            typeof live === 'boolean'
              ? 'boolean'
              : typeof live === 'number'
                ? Number.isInteger(live)
                  ? 'integer'
                  : 'double'
                : 'string'
          // an integer literal is a valid double
          expect(
            actual === expected ||
              (expected === 'double' && actual === 'integer'),
            `${algorithm.name}.${editable.name}: ${actual} vs ${expected}`,
          ).toBe(true)
        }
      }
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
      const numElements = 2000
      const threshold = 1000

      const result = getDefaultLayout(numElements, threshold, false)

      expect(result).toBeUndefined()
    })

    it('should return layout for small networks', () => {
      const numElements = 100
      const threshold = 1000

      const result = getDefaultLayout(numElements, threshold, false)

      expect(result).toBeDefined()
      if (result) {
        expect(result.engineName).toBeDefined()
        expect(result.algorithmName).toBeDefined()
      }
    })

    it('should return grid layout for networks at threshold', () => {
      const numElements = ELE_THRESHOLD
      const threshold = 1000

      const result = getDefaultLayout(numElements, threshold, false)

      expect(result).toBeDefined()
      if (result) {
        expect(result.algorithmName).toBe('grid')
      }
    })

    it('should return the hierarchical (dagre) layout for HCX networks', () => {
      const result = getDefaultLayout(100, 1000, true)

      expect(result).toBeDefined()
      if (result) {
        expect(result.algorithmName).toBe(defHierarchicalAlgorithm.name)
      }
    })

    it('should return layout for networks above threshold but below max threshold', () => {
      const numElements = 1500
      const maxThreshold = 2000

      const result = getDefaultLayout(numElements, maxThreshold, false)

      expect(result).toBeDefined()
    })

    it('should return undefined when numElements exceeds maxNetworkElementsThreshold', () => {
      const numElements = 1500
      const maxThreshold = 1000

      const result = getDefaultLayout(numElements, maxThreshold, false)

      expect(result).toBeUndefined()
    })
  })
})
