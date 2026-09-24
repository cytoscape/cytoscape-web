import 'fake-indexeddb/auto'
import debug from 'debug'
import { enableMapSet } from 'immer'
import { expect, vi } from 'vitest'

// Enable Immer's MapSet plugin to support Map and Set in Immer
enableMapSet()

// The debug package's Node build writes straight to process.stderr, bypassing
// Vitest's console interception — so `src/debug.ts` loggers enabled during
// boot tests would still print in the `:quiet` scripts. Drop them entirely.
if (process.env.CYWEB_TEST_QUIET !== undefined) {
  debug.log = () => {}
}

// 1s is a deliberately tight default: a DOM-free unit test that takes longer
// is stuck, not slow. React render specs (`.tsx`) are the exception — mounting
// an MUI dialog tree for the first time, with 16 workers competing for the
// box, regularly crosses 1s and produced 13-16 spurious failures per full run.
// Give those files 5s; still tight enough to catch a hang.
const isReactSpec = (expect.getState().testPath ?? '').endsWith('.tsx')
vi.setConfig({ testTimeout: isReactSpec ? 5000 : 1000 })

// JSDOM Canvas 2D context stub for Cytoscape.js and cyCanvas operation in tests
if (typeof HTMLCanvasElement !== 'undefined') {
  const baseContext = {
    canvas: null as any,
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    miterLimit: 10,
    backingStorePixelRatio: 1,
    webkitBackingStorePixelRatio: 1,
    mozBackingStorePixelRatio: 1,
    msBackingStorePixelRatio: 1,
    oBackingStorePixelRatio: 1,
    filter: 'none',
    imageSmoothingEnabled: true,
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    globalAlpha: 1.0,
    globalCompositeOperation: 'source-over',
    measureText: (text: string) => ({
      width: (text?.length ?? 0) * 8,
      actualBoundingBoxAscent: 8,
      actualBoundingBoxDescent: 2,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: (text?.length ?? 0) * 8,
      fontBoundingBoxAscent: 8,
      fontBoundingBoxDescent: 2,
      emHeightAscent: 8,
      emHeightDescent: 2,
      hangingBaseline: 8,
      alphabeticBaseline: 0,
      ideographicBaseline: -2,
    }),
    getImageData: (x: number, y: number, w: number, h: number) => ({
      data: new Uint8ClampedArray(
        Math.max(0, Math.floor(w) * Math.floor(h) * 4),
      ),
      width: Math.floor(w),
      height: Math.floor(h),
      colorSpace: 'srgb',
    }),
    createLinearGradient: () => ({
      addColorStop: () => {},
    }),
    createRadialGradient: () => ({
      addColorStop: () => {},
    }),
    createPattern: () => null,
    getContextAttributes: () => ({
      alpha: true,
      desynchronized: false,
    }),
    getTransform: () => ({
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      e: 0,
      f: 0,
      m11: 1,
      m12: 0,
      m13: 0,
      m14: 0,
      m21: 0,
      m22: 1,
      m23: 0,
      m24: 0,
      m31: 0,
      m32: 0,
      m33: 1,
      m34: 0,
      m41: 0,
      m42: 0,
      m43: 0,
      m44: 1,
      is2D: true,
      isIdentity: true,
    }),
    setTransform: () => {},
    resetTransform: () => {},
    save: () => {},
    restore: () => {},
    scale: () => {},
    rotate: () => {},
    translate: () => {},
    transform: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    bezierCurveTo: () => {},
    quadraticCurveTo: () => {},
    arc: () => {},
    arcTo: () => {},
    ellipse: () => {},
    rect: () => {},
    roundRect: () => {},
    clearRect: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
    strokeText: () => {},
    stroke: () => {},
    fill: () => {},
    clip: () => {},
    isPointInPath: () => false,
    isPointInStroke: () => false,
    drawImage: () => {},
    putImageData: () => {},
    setLineDash: () => {},
    getLineDash: () => [],
  }

  const createContextProxy = (canvas: HTMLCanvasElement) => {
    const state: Record<string | symbol, any> = { canvas }
    const methodCache = new Map<string | symbol, any>()
    return new Proxy(state, {
      get(target, prop, receiver) {
        if (prop in target) {
          return target[prop]
        }
        if (prop in baseContext) {
          const val = (baseContext as any)[prop]
          if (typeof val === 'function') {
            let bound = methodCache.get(prop)
            if (!bound) {
              bound = val.bind(receiver)
              methodCache.set(prop, bound)
            }
            return bound
          }
          return val
        }
        let fallback = methodCache.get(prop)
        if (!fallback) {
          fallback = (..._args: any[]) => {}
          methodCache.set(prop, fallback)
        }
        return fallback
      },
      set(target, prop, value) {
        target[prop] = value
        return true
      },
    })
  }

  HTMLCanvasElement.prototype.getContext = function (
    this: HTMLCanvasElement,
    contextId: string,
    ..._args: any[]
  ) {
    if (contextId === '2d') {
      if (!(this as any)._dummy2dContext) {
        ;(this as any)._dummy2dContext = createContextProxy(this)
      }
      return (this as any)._dummy2dContext
    }
    return null
  } as any

  HTMLCanvasElement.prototype.toDataURL = function (this: HTMLCanvasElement) {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  }
}
