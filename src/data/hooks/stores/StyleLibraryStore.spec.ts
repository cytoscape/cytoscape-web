import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createVisualStyle } from '../../../models/VisualStyleModel/impl/visualStyleFnImpl'
import { useStyleLibraryStore } from './StyleLibraryStore'

const dbMocks = vi.hoisted(() => ({
  getAllStyleTemplatesFromDb: vi.fn().mockResolvedValue([]),
  putStyleTemplateToDb: vi.fn().mockResolvedValue(undefined),
  deleteStyleTemplateFromDb: vi.fn().mockResolvedValue(undefined),
  clearStyleLibraryFromDb: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../db')>()
  return {
    ...actual,
    ...dbMocks,
  }
})

describe('useStyleLibraryStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const { result } = renderHook(() => useStyleLibraryStore())
    act(() => {
      result.current.deleteAllTemplates()
    })
    useStyleLibraryStore.setState({ initialized: false })
  })

  describe('addTemplate', () => {
    it('should add a template and persist it', () => {
      const { result } = renderHook(() => useStyleLibraryStore())
      const visualStyle = createVisualStyle()
      let id = ''
      act(() => {
        id = result.current.addTemplate('Publication', visualStyle)
      })

      expect(result.current.templates[id]).toBeDefined()
      expect(result.current.templates[id].name).toBe('Publication')
      expect(dbMocks.putStyleTemplateToDb).toHaveBeenCalledTimes(1)
    })

    it('should strip bypasses from the saved template', () => {
      const { result } = renderHook(() => useStyleLibraryStore())
      const visualStyle = createVisualStyle()
      visualStyle.nodeBackgroundColor.bypassMap.set('node-1', '#FF0000')
      let id = ''
      act(() => {
        id = result.current.addTemplate('With Bypasses', visualStyle)
      })
      expect(
        result.current.templates[id].visualStyle.nodeBackgroundColor.bypassMap
          .size,
      ).toBe(0)
      // The source must be untouched
      expect(visualStyle.nodeBackgroundColor.bypassMap.size).toBe(1)
    })

    it('should deep-copy the style so later edits do not leak in', () => {
      const { result } = renderHook(() => useStyleLibraryStore())
      const visualStyle = createVisualStyle()
      visualStyle.nodeShape.defaultValue = 'ellipse'
      let id = ''
      act(() => {
        id = result.current.addTemplate('Snapshot', visualStyle)
      })
      visualStyle.nodeShape.defaultValue = 'diamond'
      expect(
        result.current.templates[id].visualStyle.nodeShape.defaultValue,
      ).toBe('ellipse')
    })

    it('should de-duplicate template names', () => {
      const { result } = renderHook(() => useStyleLibraryStore())
      let secondId = ''
      act(() => {
        result.current.addTemplate('Style', createVisualStyle())
        secondId = result.current.addTemplate('Style', createVisualStyle())
      })
      expect(result.current.templates[secondId].name).toBe('Style 2')
    })
  })

  describe('renameTemplate', () => {
    it('should rename and persist', () => {
      const { result } = renderHook(() => useStyleLibraryStore())
      let id = ''
      act(() => {
        id = result.current.addTemplate('Old Name', createVisualStyle())
      })
      act(() => {
        result.current.renameTemplate(id, 'New Name')
      })
      expect(result.current.templates[id].name).toBe('New Name')
      expect(dbMocks.putStyleTemplateToDb).toHaveBeenCalledTimes(2)
    })

    it('should ignore unknown template ids', () => {
      const { result } = renderHook(() => useStyleLibraryStore())
      act(() => {
        result.current.renameTemplate('nonexistent', 'Name')
      })
      expect(dbMocks.putStyleTemplateToDb).not.toHaveBeenCalled()
    })
  })

  describe('deleteTemplate', () => {
    it('should delete from state and DB', () => {
      const { result } = renderHook(() => useStyleLibraryStore())
      let id = ''
      act(() => {
        id = result.current.addTemplate('Doomed', createVisualStyle())
      })
      act(() => {
        result.current.deleteTemplate(id)
      })
      expect(result.current.templates[id]).toBeUndefined()
      expect(dbMocks.deleteStyleTemplateFromDb).toHaveBeenCalledWith(id)
    })
  })

  describe('hydrate', () => {
    it('should load templates from the DB once', async () => {
      const stored = {
        id: 'template-1',
        name: 'Stored',
        visualStyle: createVisualStyle(),
      }
      dbMocks.getAllStyleTemplatesFromDb.mockResolvedValue([stored])
      const { result } = renderHook(() => useStyleLibraryStore())

      await act(async () => {
        await result.current.hydrate()
      })
      expect(result.current.templates['template-1']).toEqual(stored)
      expect(result.current.initialized).toBe(true)

      await act(async () => {
        await result.current.hydrate()
      })
      expect(dbMocks.getAllStyleTemplatesFromDb).toHaveBeenCalledTimes(1)
    })

    it('should survive a DB failure without marking initialized', async () => {
      dbMocks.getAllStyleTemplatesFromDb.mockRejectedValue(new Error('db down'))
      const { result } = renderHook(() => useStyleLibraryStore())
      await act(async () => {
        await result.current.hydrate()
      })
      expect(result.current.initialized).toBe(false)
    })
  })
})
