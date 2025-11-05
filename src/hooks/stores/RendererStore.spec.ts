import { act, renderHook } from '@testing-library/react'

import { IdType } from '../../models/IdType'
import { Renderer } from '../../models/RendererModel/Renderer'
import { ViewPort } from '../../models/RendererModel/ViewPort'
import { useRendererStore } from './RendererStore'

// Mock DefaultRenderer to avoid module import issues
jest.mock('../../features/DefaultRenderer', () => ({
  DefaultRenderer: {
    id: 'default-renderer',
    name: 'Default Renderer',
    getComponent: () => null,
  },
}))

describe('useRendererStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    const { result } = renderHook(() => useRendererStore())
    act(() => {
      // Clear viewports for testing
      result.current.viewports = {}
    })
  })

  const createTestRenderer = (id: string): Renderer => {
    return {
      id,
      name: `Renderer ${id}`,
      getComponent: () => null as any,
    }
  }

  const createTestViewport = (): ViewPort => {
    return {
      zoom: 1.0,
      pan: { x: 0, y: 0 },
    }
  }

  describe('add', () => {
    it('should add a renderer', () => {
      const { result } = renderHook(() => useRendererStore())
      const renderer = createTestRenderer('renderer-1')

      act(() => {
        result.current.add(renderer)
      })

      expect(result.current.renderers['renderer-1']).toEqual(renderer)
    })

    it('should handle multiple renderers', () => {
      const { result } = renderHook(() => useRendererStore())
      const renderer1 = createTestRenderer('renderer-1')
      const renderer2 = createTestRenderer('renderer-2')

      act(() => {
        result.current.add(renderer1)
        result.current.add(renderer2)
      })

      expect(result.current.renderers['renderer-1']).toEqual(renderer1)
      expect(result.current.renderers['renderer-2']).toEqual(renderer2)
    })
  })

  describe('delete', () => {
    it('should delete a renderer', () => {
      const { result } = renderHook(() => useRendererStore())
      const renderer = createTestRenderer('renderer-1')

      act(() => {
        result.current.add(renderer)
        result.current.delete('renderer-1')
      })

      expect(result.current.renderers['renderer-1']).toBeUndefined()
    })

    it('should not affect other renderers', () => {
      const { result } = renderHook(() => useRendererStore())
      const renderer1 = createTestRenderer('renderer-1')
      const renderer2 = createTestRenderer('renderer-2')

      act(() => {
        result.current.add(renderer1)
        result.current.add(renderer2)
        result.current.delete('renderer-1')
      })

      expect(result.current.renderers['renderer-1']).toBeUndefined()
      expect(result.current.renderers['renderer-2']).toEqual(renderer2)
    })
  })

  describe('setViewport', () => {
    it('should set viewport for a renderer and network', () => {
      const { result } = renderHook(() => useRendererStore())
      const rendererId = 'renderer-1'
      const networkId: IdType = 'network-1'
      const viewport = createTestViewport()

      act(() => {
        result.current.setViewport(rendererId, networkId, viewport)
      })

      expect(result.current.viewports[rendererId]?.[networkId]).toEqual(
        viewport,
      )
    })

    it('should handle multiple viewports', () => {
      const { result } = renderHook(() => useRendererStore())
      const rendererId = 'renderer-1'
      const networkId1: IdType = 'network-1'
      const networkId2: IdType = 'network-2'
      const viewport1 = createTestViewport()
      const viewport2 = { zoom: 2.0, pan: { x: 10, y: 20 } }

      act(() => {
        result.current.setViewport(rendererId, networkId1, viewport1)
        result.current.setViewport(rendererId, networkId2, viewport2)
      })

      expect(result.current.viewports[rendererId]?.[networkId1]).toEqual(
        viewport1,
      )
      expect(result.current.viewports[rendererId]?.[networkId2]).toEqual(
        viewport2,
      )
    })

    it('should handle multiple renderers', () => {
      const { result } = renderHook(() => useRendererStore())
      const rendererId1 = 'renderer-1'
      const rendererId2 = 'renderer-2'
      const networkId: IdType = 'network-1'
      const viewport1 = createTestViewport()
      const viewport2 = { zoom: 2.0, pan: { x: 10, y: 20 } }

      act(() => {
        result.current.setViewport(rendererId1, networkId, viewport1)
        result.current.setViewport(rendererId2, networkId, viewport2)
      })

      expect(result.current.viewports[rendererId1]?.[networkId]).toEqual(
        viewport1,
      )
      expect(result.current.viewports[rendererId2]?.[networkId]).toEqual(
        viewport2,
      )
    })
  })

  describe('getViewport', () => {
    it('should get viewport for a renderer and network', () => {
      const { result } = renderHook(() => useRendererStore())
      const rendererId = 'renderer-1'
      const networkId: IdType = 'network-1'
      const viewport = createTestViewport()

      act(() => {
        result.current.setViewport(rendererId, networkId, viewport)
      })

      const retrievedViewport = result.current.getViewport(
        rendererId,
        networkId,
      )

      expect(retrievedViewport).toEqual(viewport)
    })

    it('should return undefined if viewport does not exist', () => {
      const { result } = renderHook(() => useRendererStore())

      const retrievedViewport = result.current.getViewport(
        'non-existent',
        'non-existent' as IdType,
      )

      expect(retrievedViewport).toBeUndefined()
    })
  })

  describe('integration scenarios', () => {
    it('should handle complete workflow: add renderer, set viewport, get viewport, delete renderer', () => {
      const { result } = renderHook(() => useRendererStore())
      const renderer = createTestRenderer('renderer-1')
      const networkId: IdType = 'network-1'
      const viewport = createTestViewport()

      act(() => {
        result.current.add(renderer)
        result.current.setViewport(renderer.id, networkId, viewport)
      })

      const retrievedViewport = result.current.getViewport(
        renderer.id,
        networkId,
      )
      expect(retrievedViewport).toEqual(viewport)

      act(() => {
        result.current.delete(renderer.id)
      })

      expect(result.current.renderers[renderer.id]).toBeUndefined()
    })
  })
})

