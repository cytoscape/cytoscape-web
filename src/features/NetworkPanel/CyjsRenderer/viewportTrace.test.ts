import { renderHook } from '@testing-library/react'
import type { Core } from 'cytoscape'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { removeCywebSessionStorage } from '@/data/db/browserStorageInventory'
import { registerDebugTool } from '@/debug'

import {
  classifyZoomCause,
  clearViewportTrace,
  getViewportTrace,
  installViewportTrace,
  MAX_TRACE_ENTRIES,
  parseStoredTrace,
  persistTrace,
  recordPageEvent,
  resetViewportTraceForTests,
  TRACE_STORAGE_KEY,
  traceZoomEvents,
  useViewportTrace,
} from './viewportTrace'

vi.mock('@/debug', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/debug')>()
  return { ...actual, registerDebugTool: vi.fn(() => vi.fn()) }
})

// ── Cytoscape.js stand-in ─────────────────────────────────────────────────────
// Enough of the instance for the trace: zoom get/set that emits 'zoom', a fit
// that zooms to a size-dependent level, cached width/height, and on().

const createCy = (size = { width: 800, height: 600 }) => {
  let zoom = 1
  let handlers: Array<() => void> = []
  const emitZoom = (): void => handlers.forEach((handler) => handler())
  const cy = {
    zoom: (level?: number) => {
      if (level === undefined) return zoom
      zoom = level
      emitZoom()
      return cy
    },
    // Like Cytoscape.js: the fitted zoom scales with the cached canvas size,
    // and 'zoom' is emitted even when the level is unchanged.
    fit: () => {
      zoom = size.width / 800
      emitZoom()
      return cy
    },
    width: () => size.width,
    height: () => size.height,
    on: (_event: string, handler: () => void) => {
      handlers.push(handler)
      return cy
    },
    removeAllListeners: () => {
      handlers = []
      return cy
    },
  }
  return { cy: cy as unknown as Core, size }
}

const zoomEntries = () =>
  getViewportTrace().filter((entry) => entry.kind === 'zoom')

beforeEach(() => {
  sessionStorage.clear()
  resetViewportTraceForTests()
})

afterEach(() => {
  clearViewportTrace()
})

describe('parseStoredTrace', () => {
  it('returns [] for missing, malformed or non-array data', () => {
    expect(parseStoredTrace(null)).toEqual([])
    expect(parseStoredTrace('{not json')).toEqual([])
    expect(parseStoredTrace('{"t":"x"}')).toEqual([])
    expect(parseStoredTrace('"text"')).toEqual([])
  })

  it('drops entries that are not well-formed', () => {
    const good = {
      t: '2026-11-20T00:00:00.000Z',
      kind: 'page',
      what: 'load',
      visibility: 'visible',
      focused: true,
    }
    const raw = JSON.stringify([
      good,
      null,
      { ...good, kind: 'evil' },
      { ...good, focused: 'yes' },
      { __proto__: { polluted: true } },
    ])
    expect(parseStoredTrace(raw)).toEqual([good])
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  it('drops entries whose optional fields have the wrong type', () => {
    const good = {
      t: '2026-11-20T00:00:00.000Z',
      kind: 'zoom',
      what: 'wheel',
      visibility: 'visible',
      focused: true,
      count: 2,
      zoomBefore: 1,
      zoomAfter: 0.5,
    }
    const raw = JSON.stringify([
      good,
      { ...good, count: '2' },
      { ...good, count: 0 },
      { ...good, count: 1.5 },
      { ...good, zoomAfter: 'x' },
      { ...good, zoomBefore: null },
      { ...good, networkId: 7 },
      { ...good, stack: {} },
    ])
    expect(parseStoredTrace(raw)).toEqual([good])
  })

  it('keeps only the newest MAX_TRACE_ENTRIES', () => {
    const many = Array.from({ length: MAX_TRACE_ENTRIES + 5 }, (_, i) => ({
      t: '2026-11-20T00:00:00.000Z',
      kind: 'page',
      what: `e${i}`,
      visibility: 'visible',
      focused: false,
    }))
    const parsed = parseStoredTrace(JSON.stringify(many))
    expect(parsed).toHaveLength(MAX_TRACE_ENTRIES)
    expect(parsed[0].what).toBe('e5')
  })
})

describe('classifyZoomCause', () => {
  it('prefers fit, then a recent wheel or pinch, else other', () => {
    const now = 10_000
    expect(classifyZoomCause({ fitDepth: 1, lastWheel: null }, now)).toBe('fit')
    expect(
      classifyZoomCause(
        {
          fitDepth: 0,
          lastWheel: { time: now - 10, ctrlKey: false, deltaY: 4 },
        },
        now,
      ),
    ).toBe('wheel')
    expect(
      classifyZoomCause(
        {
          fitDepth: 0,
          lastWheel: { time: now - 10, ctrlKey: true, deltaY: 4 },
        },
        now,
      ),
    ).toBe('pinch')
    expect(
      classifyZoomCause(
        {
          fitDepth: 0,
          lastWheel: { time: now - 5_000, ctrlKey: false, deltaY: 4 },
        },
        now,
      ),
    ).toBe('other')
  })
})

describe('zoom recording', () => {
  it('records a fit with the cached size, real box size and a stack', () => {
    const { cy, size } = createCy()
    const container = document.createElement('div')
    Object.defineProperty(container, 'clientWidth', { value: 800 })
    Object.defineProperty(container, 'clientHeight', { value: 600 })
    const uninstall = installViewportTrace(cy, container)
    traceZoomEvents(cy, 'net-1')

    // The bug's suspected shape: a fit while cy has a tiny cached size.
    size.width = 30
    size.height = 30
    cy.fit()

    const [entry] = zoomEntries()
    expect(entry).toMatchObject({
      kind: 'zoom',
      what: 'fit',
      networkId: 'net-1',
      zoomBefore: 1,
      zoomAfter: 0.0375,
      cySize: '30x30',
      box: '800x600',
    })
    expect(entry.stack).toBeTypeOf('string')
    // A large drop is persisted at once, not only when the page is hidden.
    expect(
      parseStoredTrace(sessionStorage.getItem(TRACE_STORAGE_KEY)),
    ).toContainEqual(entry)
    uninstall()
  })

  it('ignores a fit that leaves the zoom unchanged', () => {
    const { cy } = createCy()
    const uninstall = installViewportTrace(cy, null)
    traceZoomEvents(cy, 'net-1')
    cy.fit()
    expect(zoomEntries()).toEqual([])
    uninstall()
  })

  it('records a zoom outside fit as "other"', () => {
    const { cy } = createCy()
    const uninstall = installViewportTrace(cy, null)
    traceZoomEvents(cy, 'net-1')
    cy.zoom(2)
    expect(zoomEntries()).toMatchObject([{ what: 'other', zoomAfter: 2 }])
    uninstall()
  })

  it('merges a wheel gesture into one entry and tells pinch apart', () => {
    const { cy } = createCy()
    const container = document.createElement('div')
    const uninstall = installViewportTrace(cy, container)
    traceZoomEvents(cy, 'net-1')

    for (const level of [0.9, 0.8, 0.7]) {
      container.dispatchEvent(new WheelEvent('wheel', { deltaY: 5 }))
      cy.zoom(level)
    }
    container.dispatchEvent(
      new WheelEvent('wheel', { deltaY: -3, ctrlKey: true }),
    )
    cy.zoom(0.75)

    expect(zoomEntries()).toMatchObject([
      { what: 'wheel', zoomBefore: 1, zoomAfter: 0.7, count: 3 },
      { what: 'pinch', zoomBefore: 0.7, zoomAfter: 0.75 },
    ])
    expect(zoomEntries()[0].stack).toBeUndefined()
    uninstall()
  })

  it('restores the native fit on uninstall', () => {
    const { cy } = createCy()
    const nativeFit = cy.fit
    const uninstall = installViewportTrace(cy, null)
    expect(cy.fit).not.toBe(nativeFit)
    uninstall()
    expect(cy.fit).toBe(nativeFit)
  })

  it('still records after removeAllListeners once re-attached', () => {
    const { cy } = createCy()
    const uninstall = installViewportTrace(cy, null)
    traceZoomEvents(cy, 'net-1')
    cy.removeAllListeners()
    traceZoomEvents(cy, 'net-2')
    cy.zoom(3)
    expect(zoomEntries()).toMatchObject([{ networkId: 'net-2' }])
    uninstall()
  })
})

describe('page events and persistence', () => {
  it('merges a burst of the same page event', () => {
    recordPageEvent('resize', 'a')
    recordPageEvent('resize', 'b')
    const resizes = getViewportTrace().filter((e) => e.what === 'resize')
    expect(resizes).toMatchObject([{ detail: 'b' }])
  })

  it('survives a reload through sessionStorage', () => {
    recordPageEvent('hidden')
    persistTrace()
    resetViewportTraceForTests()
    expect(getViewportTrace().map((e) => e.what)).toContain('hidden')
  })

  it('saves every entry recorded while the page is hidden', () => {
    // Chrome can discard a hidden page without firing another event.
    const visibility = vi
      .spyOn(document, 'visibilityState', 'get')
      .mockReturnValue('hidden')
    const { cy } = createCy()
    const uninstall = installViewportTrace(cy, null)
    traceZoomEvents(cy, 'net-1')

    cy.zoom(0.6)

    const stored = parseStoredTrace(sessionStorage.getItem(TRACE_STORAGE_KEY))
    expect(stored.filter((e) => e.kind === 'zoom')).toMatchObject([
      { zoomAfter: 0.6, visibility: 'hidden' },
    ])
    uninstall()
    visibility.mockRestore()
  })

  it('does not save small visible zooms on every change', () => {
    const { cy } = createCy()
    const uninstall = installViewportTrace(cy, null)
    traceZoomEvents(cy, 'net-1')

    cy.zoom(0.6)

    const stored = parseStoredTrace(sessionStorage.getItem(TRACE_STORAGE_KEY))
    expect(stored.filter((e) => e.kind === 'zoom')).toEqual([])
    uninstall()
  })

  it('caps the buffer at MAX_TRACE_ENTRIES', () => {
    for (let i = 0; i < MAX_TRACE_ENTRIES + 10; i++) {
      recordPageEvent(`e${i}`)
    }
    const trace = getViewportTrace()
    expect(trace).toHaveLength(MAX_TRACE_ENTRIES)
    expect(trace.at(-1)?.what).toBe(`e${MAX_TRACE_ENTRIES + 9}`)
  })
})

describe('Clear Local Cache', () => {
  it('forgets the trace and does not write it back as the page unloads', () => {
    const { cy } = createCy()
    const uninstall = installViewportTrace(cy, null)
    traceZoomEvents(cy, 'net-1')
    cy.zoom(0.6)
    persistTrace()

    removeCywebSessionStorage()
    // The reload that follows a clear fires pagehide, which persists.
    window.dispatchEvent(new Event('pagehide'))

    expect(sessionStorage.getItem(TRACE_STORAGE_KEY)).toBeNull()
    expect(getViewportTrace().filter((e) => e.kind === 'zoom')).toEqual([])
    uninstall()
  })
})

describe('debug tools', () => {
  it('are registered once for the page and stay while renderers come and go', () => {
    const registered = vi.mocked(registerDebugTool)
    const container = { current: document.createElement('div') }
    const first = renderHook(() => useViewportTrace(createCy().cy, container))
    const second = renderHook(() => useViewportTrace(createCy().cy, container))

    first.unmount()
    second.unmount()

    const names = registered.mock.calls.map(([name]) => name)
    expect(names.filter((name) => name === 'viewportTrace')).toHaveLength(1)
    expect(names.filter((name) => name === 'clearViewportTrace')).toHaveLength(
      1,
    )
    // None of their unregister functions was called.
    for (const result of registered.mock.results) {
      expect(result.value).not.toHaveBeenCalled()
    }
  })
})
