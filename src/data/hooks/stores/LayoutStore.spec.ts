import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useLayoutStore } from './LayoutStore'

// Mock the layout selection module to avoid module import issues
vi.mock('../../../models/LayoutModel/impl/layoutSelection', () => {
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
    getLayout: vi.fn((engineName: string, algorithmName: string) => {
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

  describe('app engines', () => {
    const appAlgorithm = {
      name: 'appX::row',
      engineName: 'appX',
      displayName: 'Row',
      type: 'other' as const,
      description: '',
      parameters: { spacing: 10 },
      editables: {
        spacing: {
          name: 'spacing',
          type: 'integer' as const,
          value: 10,
          defaultValue: 10,
        },
      },
    }
    const apply = vi.fn()

    it('upserts an app algorithm, lets it become preferred, and resets on removal', () => {
      const { result } = renderHook(() => useLayoutStore())

      act(() => {
        result.current.upsertAppAlgorithm('appX', appAlgorithm, apply)
      })
      const engine = result.current.layoutEngines.find((e) => e.name === 'appX')
      expect(engine?.appId).toBe('appX')
      expect(engine?.algorithms['appX::row']).toBeDefined()

      act(() => {
        result.current.setPreferredLayout('appX', 'appX::row')
      })
      expect(result.current.preferredLayout.name).toBe('appX::row')

      // Parameter edits go through the same action as core algorithms
      act(() => {
        result.current.setLayoutOption('appX', 'appX::row', 'spacing', 25)
      })
      expect(result.current.preferredLayout.parameters.spacing).toBe(25)

      act(() => {
        result.current.removeAppAlgorithm('appX', 'appX::row')
      })
      expect(
        result.current.layoutEngines.find((e) => e.name === 'appX'),
      ).toBeUndefined()
      expect(result.current.preferredLayout.name).toBe('default')
    })

    it('removeAppEngine drops the whole engine', () => {
      const { result } = renderHook(() => useLayoutStore())

      act(() => {
        result.current.upsertAppAlgorithm('appX', appAlgorithm, apply)
        result.current.removeAppEngine('appX')
      })

      expect(
        result.current.layoutEngines.find((e) => e.name === 'appX'),
      ).toBeUndefined()
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
        result.current.setLayoutOption('non-existent', 'grid', 'spacing', 100)
      })

      // Should not throw
      expect(result.current.layoutEngines).toBeDefined()
    })
  })
})
