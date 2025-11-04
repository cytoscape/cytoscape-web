import { DEFAULT_RENDERER_ID } from './defaultRenderer'

// to run these: npx jest src/models/RendererModel/impl/defaultRenderer.test.ts

describe('defaultRenderer', () => {
  describe('DEFAULT_RENDERER_ID', () => {
    it('should be set to "cyjs"', () => {
      expect(DEFAULT_RENDERER_ID).toBe('cyjs')
    })

    it('should be a string', () => {
      expect(typeof DEFAULT_RENDERER_ID).toBe('string')
    })
  })
})

