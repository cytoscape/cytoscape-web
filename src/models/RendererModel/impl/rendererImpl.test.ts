import { IdType } from '../../IdType'
import { Renderer } from '../Renderer'
import { ViewPort } from '../ViewPort'
import {
  add,
  deleteRenderer,
  getViewport,
  RendererState,
  setViewport,
} from './rendererImpl'

const createDefaultState = (): RendererState => {
  return {
    renderers: {},
    defaultRendererName: 'default',
    viewports: {},
  }
}

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

describe('RendererImpl', () => {
  describe('add', () => {
    it('should add a renderer', () => {
      const state = createDefaultState()
      const renderer = createTestRenderer('renderer-1')

      const result = add(state, renderer)

      expect(result.renderers['renderer-1']).toEqual(renderer)
      expect(result).not.toBe(state) // Immutability check
      expect(state.renderers['renderer-1']).toBeUndefined() // Original unchanged
    })

    it('should handle multiple renderers', () => {
      const state = createDefaultState()
      const renderer1 = createTestRenderer('renderer-1')
      const renderer2 = createTestRenderer('renderer-2')

      let result = add(state, renderer1)
      result = add(result, renderer2)

      expect(result.renderers['renderer-1']).toEqual(renderer1)
      expect(result.renderers['renderer-2']).toEqual(renderer2)
    })
  })

  describe('deleteRenderer', () => {
    it('should delete a renderer', () => {
      const state = createDefaultState()
      const renderer = createTestRenderer('renderer-1')

      let result = add(state, renderer)
      result = deleteRenderer(result, 'renderer-1')

      expect(result.renderers['renderer-1']).toBeUndefined()
      expect(result).not.toBe(state) // Immutability check
    })

    it('should not affect other renderers', () => {
      const state = createDefaultState()
      const renderer1 = createTestRenderer('renderer-1')
      const renderer2 = createTestRenderer('renderer-2')

      let result = add(state, renderer1)
      result = add(result, renderer2)
      result = deleteRenderer(result, 'renderer-1')

      expect(result.renderers['renderer-1']).toBeUndefined()
      expect(result.renderers['renderer-2']).toEqual(renderer2)
    })
  })

  describe('setViewport', () => {
    it('should set viewport for a renderer and network', () => {
      const state = createDefaultState()
      const rendererId = 'renderer-1'
      const networkId: IdType = 'network-1'
      const viewport = createTestViewport()

      const result = setViewport(state, rendererId, networkId, viewport)

      expect(result.viewports[rendererId]?.[networkId]).toEqual(viewport)
      expect(result).not.toBe(state) // Immutability check
      expect(state.viewports[rendererId]).toBeUndefined() // Original unchanged
    })

    it('should handle multiple viewports', () => {
      const state = createDefaultState()
      const rendererId = 'renderer-1'
      const networkId1: IdType = 'network-1'
      const networkId2: IdType = 'network-2'
      const viewport1 = createTestViewport()
      const viewport2 = { zoom: 2.0, pan: { x: 10, y: 20 } }

      let result = setViewport(state, rendererId, networkId1, viewport1)
      result = setViewport(result, rendererId, networkId2, viewport2)

      expect(result.viewports[rendererId]?.[networkId1]).toEqual(viewport1)
      expect(result.viewports[rendererId]?.[networkId2]).toEqual(viewport2)
    })
  })

  describe('getViewport', () => {
    it('should get viewport for a renderer and network', () => {
      const state = createDefaultState()
      const rendererId = 'renderer-1'
      const networkId: IdType = 'network-1'
      const viewport = createTestViewport()

      const stateWithViewport = setViewport(state, rendererId, networkId, viewport)

      const retrievedViewport = getViewport(
        stateWithViewport,
        rendererId,
        networkId,
      )

      expect(retrievedViewport).toEqual(viewport)
    })

    it('should return undefined if viewport does not exist', () => {
      const state = createDefaultState()

      const retrievedViewport = getViewport(
        state,
        'non-existent',
        'non-existent' as IdType,
      )

      expect(retrievedViewport).toBeUndefined()
    })
  })

  describe('immutability', () => {
    it('should not mutate the original state', () => {
      const original = createDefaultState()
      const originalRenderers = original.renderers
      const originalViewports = original.viewports

      let state = add(original, createTestRenderer('renderer-1'))
      state = setViewport(state, 'renderer-1', 'network-1' as IdType, createTestViewport())
      state = deleteRenderer(state, 'renderer-1')

      // Verify original is unchanged
      expect(original.renderers).toBe(originalRenderers)
      expect(original.viewports).toBe(originalViewports)
      expect(original.renderers['renderer-1']).toBeUndefined()
      expect(original.viewports['renderer-1']).toBeUndefined()
    })
  })
})

