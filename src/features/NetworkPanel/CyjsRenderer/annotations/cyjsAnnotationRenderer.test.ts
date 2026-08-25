import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  createSizedContainer,
  createTestCytoscape,
} from '../__testUtils__/renderCyjs'
import { createAnnotationLayers, CxToCyCanvas } from './cyjsAnnotationRenderer'

describe('cyjsAnnotationRenderer', () => {
  let cy: any
  let container: HTMLDivElement
  let destroyCy: () => void

  beforeEach(() => {
    container = createSizedContainer()
    const testCy = createTestCytoscape({ container })
    cy = testCy.cy
    destroyCy = testCy.destroy
  })

  afterEach(() => {
    destroyCy()
  })

  describe('CxToCyCanvas - getAnnotationElementsFromNiceCX', () => {
    const painter = new CxToCyCanvas()

    it('returns empty array when networkAttributes is missing', () => {
      expect(painter.getAnnotationElementsFromNiceCX({})).toEqual([])
      expect(painter.getAnnotationElementsFromNiceCX({ other: 123 })).toEqual(
        [],
      )
    })

    it('filters elements by n === "__Annotations"', () => {
      const niceCX = {
        networkAttributes: {
          elements: [
            { n: 'name', v: 'Network Name' },
            { n: '__Annotations', v: ['uuid=ann-1|type=ShapeAnnotation'] },
            { n: 'description', v: 'Desc' },
          ],
        },
      }

      const results = painter.getAnnotationElementsFromNiceCX(niceCX)
      expect(results).toHaveLength(1)
      expect(results[0].n).toBe('__Annotations')
      expect(results[0].v).toEqual(['uuid=ann-1|type=ShapeAnnotation'])
    })
  })

  describe('createAnnotationLayers & Canvas Invariant', () => {
    it('creates exactly 2 annotation layers (5 canvases total including Cytoscape 3 base canvases)', () => {
      const initialCanvases = container.querySelectorAll('canvas').length
      expect(initialCanvases).toBe(3)

      const layers = createAnnotationLayers(cy)
      const afterInitCanvases = container.querySelectorAll('canvas').length
      expect(afterInitCanvases).toBe(5)

      layers.dispose()
    })

    it('maintains the 5-canvas count invariant across multiple render cycles (Defect L)', () => {
      const layers = createAnnotationLayers(cy)

      const sampleNiceCX = {
        networkAttributes: {
          elements: [
            {
              n: '__Annotations',
              v: [
                'uuid=shape-1|type=org.cytoscape.view.presentation.annotations.ShapeAnnotation|shapeType=RECTANGLE|x=10|y=20|width=100|height=50|fillColor=-16776961|edgeColor=-65536|edgeThickness=2',
              ],
            },
          ],
        },
      }

      // Render 3 cycles
      for (let i = 0; i < 3; i++) {
        layers.setAnnotations(sampleNiceCX)
        layers.attach()
        layers.redraw()
        const canvasCount = container.querySelectorAll('canvas').length
        expect(canvasCount).toBe(5)
      }

      layers.dispose()
    })

    it('handles malformed or invalid annotation strings without throwing', () => {
      const layers = createAnnotationLayers(cy)

      const malformedNiceCX = {
        networkAttributes: {
          elements: [
            {
              n: '__Annotations',
              v: [
                'invalid-string-without-kv',
                'uuid=bad-1|type=UnknownAnnotationType|shapeType=INVALID_SHAPE',
                'uuid=bad-2|type=org.cytoscape.view.presentation.annotations.ShapeAnnotation|shapeType=NON_EXISTENT|x=not-a-number',
                'uuid=bad-3|type=org.cytoscape.view.presentation.annotations.TextAnnotation|text=Hello|fontSize=invalid',
                'uuid=bad-4|type=org.cytoscape.view.presentation.annotations.BoundedTextAnnotation|text=Bounded|x=10|y=10|width=50|height=50',
              ],
            },
          ],
        },
      }

      expect(() => {
        layers.setAnnotations(malformedNiceCX)
        layers.attach()
        layers.redraw()
      }).not.toThrow()

      layers.dispose()
    })

    it('cleans up canvas elements and listeners on dispose', () => {
      const layers = createAnnotationLayers(cy)
      expect(container.querySelectorAll('canvas').length).toBe(5)

      layers.dispose()
      expect(container.querySelectorAll('canvas').length).toBe(3)
    })
  })
})
