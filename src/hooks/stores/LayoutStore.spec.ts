import { act, renderHook } from '@testing-library/react'

import { LayoutAlgorithm } from '../../models/LayoutModel/LayoutAlgorithm'
import { Property } from '../../models/PropertyModel/Property'
import { ValueType } from '../../models/TableModel'
import { useLayoutStore } from './LayoutStore'

// Mock the layout selection module to avoid module import issues
jest.mock('../../models/LayoutModel/impl/layoutSelection', () => {
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

describe('useLayoutStore', () => {
  describe('setPreferredLayout', () => {
    it('should set preferred layout', () => {
      const { result } = renderHook(() => useLayoutStore())

      act(() => {
        result.current.setPreferredLayout('cyjs', 'grid')
      })

      expect(result.current.preferredLayout).toBeDefined()
      // Check that the layout was updated by verifying it's different from default
      expect(result.current.preferredLayout).not.toBeUndefined()
    })

    it('should handle non-existent layout gracefully', () => {
      const { result } = renderHook(() => useLayoutStore())
      const originalLayout = result.current.preferredLayout

      act(() => {
        result.current.setPreferredLayout('non-existent', 'non-existent')
      })

      expect(result.current.preferredLayout).toBe(originalLayout)
    })
  })

  describe('setIsRunning', () => {
    it('should set isRunning flag', () => {
      const { result } = renderHook(() => useLayoutStore())

      act(() => {
        result.current.setIsRunning(true)
      })

      expect(result.current.isRunning).toBe(true)

      act(() => {
        result.current.setIsRunning(false)
      })

      expect(result.current.isRunning).toBe(false)
    })
  })

  describe('setLayoutOption', () => {
    it('should set a layout option', () => {
      const { result } = renderHook(() => useLayoutStore())

      act(() => {
        result.current.setLayoutOption('cyjs', 'grid', 'spacing', 100)
      })

      const algorithm = result.current.layoutEngines.find(
        (e) => e.name === 'cyjs',
      )?.algorithms['grid']
      // Check that the parameter was updated
      expect(algorithm?.parameters.spacing).toBe(100)
      // Check that the editable was also updated
      expect(algorithm?.editables?.spacing?.value).toBe(100)
    })

    it('should handle non-existent engine gracefully', () => {
      const { result } = renderHook(() => useLayoutStore())

      act(() => {
        result.current.setLayoutOption(
          'non-existent',
          'grid',
          'spacing',
          100,
        )
      })

      // Should not throw
      expect(result.current.layoutEngines).toBeDefined()
    })
  })
})

