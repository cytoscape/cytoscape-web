import { beforeEach, describe, expect, it } from 'vitest'
import { createAnnotationLayers } from './cyjsAnnotationRenderer'

/**
 * The single shape annotation from
 * `test/fixtures/ndex/2496d8c5-5c74-11ec-b3be-0ac135e8bacf.valid.cx2`.
 */
const SHAPE_ANNOTATION =
  'edgeThickness=1.0|canvas=background|fillOpacity=100.0|' +
  'type=org.cytoscape.view.presentation.annotations.ShapeAnnotation|' +
  'uuid=6723bbfb-39e1-49b5-83a3-b31b33426b53|' +
  'customShape=NZ M 0.0 8.0 L 100.0 8.0 L 100.0 80.0 L 0.0 80.0 Z |' +
  'shapeType=CUSTOM|edgeColor=-16777216|edgeOpacity=100.0|name=Round Rectangle|' +
  'x=300.0|width=285.33|y=650.66|z=0|height=50.66'

const niceCX = (annotations: string[]): any => ({
  networkAttributes: {
    elements: [{ n: '__Annotations', v: annotations }],
  },
})

/** A 2D context that records the drawing calls made against it. */
const createRecordingContext = (): any => {
  const calls: string[] = []
  const target: any = { calls }
  return new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop]
      return (...args: any[]) => {
        calls.push(String(prop))
        return args
      }
    },
    set(t, prop, value) {
      t[prop] = value
      return true
    },
  })
}

/**
 * A Cytoscape stand-in that mimics the parts `createAnnotationLayers` touches:
 * `cyCanvas()` appends a fresh canvas every call (as the real extension does),
 * and `removeAllListeners()` drops every handler (as `renderNetwork` does).
 */
const CONTAINER_WIDTH = 400
const CONTAINER_HEIGHT = 300

const createFakeCy = (): any => {
  const container = document.createElement('div')
  // jsdom does no layout, so the offsets a real container reports are stubbed.
  Object.defineProperty(container, 'offsetWidth', { value: CONTAINER_WIDTH })
  Object.defineProperty(container, 'offsetHeight', { value: CONTAINER_HEIGHT })
  document.body.appendChild(container)
  let handlers: Array<{ event: string; handler: (...a: any[]) => void }> = []

  const cy: any = {
    container: () => container,
    on(events: string, handler: (...a: any[]) => void) {
      events.split(/\s+/).forEach((event) => handlers.push({ event, handler }))
    },
    off(events: string, handler: (...a: any[]) => void) {
      const targets = events.split(/\s+/)
      handlers = handlers.filter(
        (h) => !(targets.includes(h.event) && h.handler === handler),
      )
    },
    removeAllListeners() {
      handlers = []
    },
    trigger(event: string) {
      handlers
        .filter((h) => h.event === event)
        .forEach(({ handler }) => handler())
    },
    handlerCount: () => handlers.length,
    canvases: () => Array.from(container.querySelectorAll('canvas')),
    cyCanvas(options: any) {
      const canvas = document.createElement('canvas')
      const ctx = createRecordingContext()
      canvas.getContext = (() => ctx) as any
      canvas.setAttribute('style', `z-index:${options.zIndex}`)
      container.appendChild(canvas)
      // The real extension registers this and loses it to removeAllListeners.
      cy.on('resize', () => {})
      return {
        getCanvas: () => canvas,
        clear: () => {},
        resetTransform: () => {},
        setTransform: () => {},
      }
    },
  }
  return cy
}

/** What `renderNetwork` does around the annotation layers on every render. */
const simulateRender = (cy: any, layers: any, annotations: string[]): void => {
  cy.removeAllListeners()
  layers.setAnnotations(niceCX(annotations))
  layers.setBackgroundColor('#FFFFFF')
  layers.attach()
  layers.redraw()
}

const paintedShapes = (cy: any): number =>
  cy
    .canvases()
    .flatMap(
      (canvas: HTMLCanvasElement) => (canvas.getContext('2d') as any).calls,
    )
    .filter((call: string) => call === 'bezierCurveTo' || call === 'lineTo')
    .length

describe('createAnnotationLayers', () => {
  let cy: any

  beforeEach(() => {
    document.body.innerHTML = ''
    cy = createFakeCy()
  })

  it('creates exactly three canvases', () => {
    createAnnotationLayers(cy)
    expect(cy.canvases()).toHaveLength(3)
  })

  it('keeps three canvases across repeated renders', () => {
    const layers = createAnnotationLayers(cy)
    for (let i = 0; i < 4; i++) {
      simulateRender(cy, layers, [SHAPE_ANNOTATION])
    }
    expect(cy.canvases()).toHaveLength(3)
  })

  it('repaints on render after renderNetwork calls removeAllListeners', () => {
    const layers = createAnnotationLayers(cy)
    simulateRender(cy, layers, [SHAPE_ANNOTATION])

    const before = paintedShapes(cy)
    cy.trigger('render')
    expect(paintedShapes(cy)).toBeGreaterThan(before)
  })

  it('does not accumulate duplicate handlers when attach is called repeatedly', () => {
    const layers = createAnnotationLayers(cy)
    layers.attach()
    const afterFirst = cy.handlerCount()
    layers.attach()
    layers.attach()
    expect(cy.handlerCount()).toBe(afterFirst)
  })

  it('draws the annotations supplied by the latest render only', () => {
    const layers = createAnnotationLayers(cy)
    simulateRender(cy, layers, [SHAPE_ANNOTATION])
    const withAnnotation = paintedShapes(cy)
    expect(withAnnotation).toBeGreaterThan(0)

    simulateRender(cy, layers, [])
    const before = paintedShapes(cy)
    cy.trigger('render')
    expect(paintedShapes(cy)).toBe(before)
  })

  it('sizes the canvases to the container on paint', () => {
    const layers = createAnnotationLayers(cy)
    const pixelRatio = window.devicePixelRatio || 1

    // The extension sized them at creation; a container that grows afterwards
    // without a Cytoscape `resize` event must still be picked up.
    cy.canvases().forEach((canvas: HTMLCanvasElement) => {
      canvas.width = 0
      canvas.height = 0
    })

    layers.redraw()

    cy.canvases().forEach((canvas: HTMLCanvasElement) => {
      expect(canvas.width).toBe(CONTAINER_WIDTH * pixelRatio)
      expect(canvas.height).toBe(CONTAINER_HEIGHT * pixelRatio)
    })
  })

  it('removes its canvases and handlers on dispose', () => {
    const layers = createAnnotationLayers(cy)
    cy.removeAllListeners() // drop the extension's own resize handlers
    layers.attach()
    layers.dispose()
    expect(cy.canvases()).toHaveLength(0)
    expect(cy.handlerCount()).toBe(0)
  })
})
