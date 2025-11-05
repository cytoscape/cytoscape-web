import { LayoutState, setIsRunning, setLayoutOption, setPreferredLayout } from './layoutStoreImpl'

// Mock the layout selection module
jest.mock('../../LayoutModel/impl/layoutSelection', () => {
  const mockGridAlgorithm = {
    name: 'grid',
    engineName: 'cyjs',
    displayName: 'Grid',
    type: 'geometric' as const,
    description: 'Grid layout',
    parameters: { spacing: 50 },
    editables: {
      spacing: {
        name: 'spacing',
        type: 'number' as const,
        value: 50,
        description: 'Spacing between nodes',
      },
    },
  }

  const mockLayoutEngine = {
    name: 'cyjs',
    algorithms: {
      grid: mockGridAlgorithm,
    },
  }

  return {
    LayoutEngines: [mockLayoutEngine],
    defAlgorithm: {
      name: 'default',
      engineName: 'cyjs',
      displayName: 'Default',
      type: 'force' as const,
      description: 'Default layout',
      parameters: {},
    },
    defHierarchicalAlgorithm: {
      name: 'default-hierarchical',
      engineName: 'cyjs',
      displayName: 'Default Hierarchical',
      type: 'hierarchical' as const,
      description: 'Default hierarchical layout',
      parameters: {},
    },
    getLayout: jest.fn((engineName: string, algorithmName: string) => {
      if (engineName === 'cyjs' && algorithmName === 'grid') {
        return mockGridAlgorithm
      }
      return undefined
    }),
  }
})

const createDefaultState = (): LayoutState => {
  const { defAlgorithm, defHierarchicalAlgorithm, LayoutEngines } = require('../../LayoutModel/impl/layoutSelection')
  return {
    layoutEngines: LayoutEngines,
    preferredLayout: defAlgorithm,
    preferredHierarchicalLayout: defHierarchicalAlgorithm,
    isRunning: false,
  }
}

describe('LayoutStoreImpl', () => {
  describe('setPreferredLayout', () => {
    it('should set preferred layout', () => {
      const state = createDefaultState()

      const result = setPreferredLayout(state, 'cyjs', 'grid')

      expect(result.preferredLayout.name).toBe('grid')
      expect(result).not.toBe(state) // Immutability check
    })

    it('should handle non-existent layout gracefully', () => {
      const state = createDefaultState()

      const result = setPreferredLayout(state, 'non-existent', 'non-existent')

      expect(result).toBe(state) // Should return unchanged
    })
  })

  describe('setIsRunning', () => {
    it('should set isRunning flag', () => {
      const state = createDefaultState()

      let result = setIsRunning(state, true)
      expect(result.isRunning).toBe(true)
      expect(result).not.toBe(state) // Immutability check

      result = setIsRunning(result, false)
      expect(result.isRunning).toBe(false)
    })
  })

  describe('setLayoutOption', () => {
    it('should set a layout option', () => {
      const state = createDefaultState()

      const result = setLayoutOption(state, 'cyjs', 'grid', 'spacing', 100)

      const algorithm = result.layoutEngines.find(
        (e) => e.name === 'cyjs',
      )?.algorithms['grid']
      expect(algorithm?.parameters.spacing).toBe(100)
      expect(algorithm?.editables?.spacing?.value).toBe(100)
      expect(result).not.toBe(state) // Immutability check
    })

    it('should handle non-existent engine gracefully', () => {
      const state = createDefaultState()

      const result = setLayoutOption(
        state,
        'non-existent',
        'grid',
        'spacing',
        100,
      )

      expect(result).toBe(state) // Should return unchanged
    })
  })

  describe('immutability', () => {
    it('should not mutate the original state', () => {
      const original = createDefaultState()
      const originalLayoutEngines = original.layoutEngines
      const originalPreferredLayout = original.preferredLayout

      let state = setPreferredLayout(original, 'cyjs', 'grid')
      state = setIsRunning(state, true)
      state = setLayoutOption(state, 'cyjs', 'grid', 'spacing', 100)

      // Verify original is unchanged
      expect(original.layoutEngines).toBe(originalLayoutEngines)
      expect(original.preferredLayout).toBe(originalPreferredLayout)
      expect(original.isRunning).toBe(false)
    })
  })
})

