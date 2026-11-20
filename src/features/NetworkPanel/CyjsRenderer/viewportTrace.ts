// src/features/NetworkPanel/CyjsRenderer/viewportTrace.ts
//
// A flight recorder for the network view's zoom, kept to diagnose a bug seen
// only in the wild: a network left fitted in a background tab for minutes or
// hours is found zoomed far out when the user comes back.
//
// Every zoom change is recorded with what caused it (a cy.fit(), a wheel or
// pinch gesture, or something else — with a stack), the canvas size cy had
// cached and the container's real size at that moment, and whether the page
// was visible. Page lifecycle events (hidden/visible, freeze/resume, window
// resize, device-pixel-ratio change, and a reload of a tab the browser
// discarded) go in the same timeline. The buffer is kept in sessionStorage, so
// it survives the reload of a discarded tab.
//
// Read it from the console with `debug.viewportTrace()` once debug mode is on
// (DEBUG_GUIDE.md §6). Recording itself is always on and cheap: a bounded
// array, written to sessionStorage only when the page is hidden or a large
// zoom drop is seen.

import type { Core } from 'cytoscape'
import { RefObject, useEffect } from 'react'

import { logUi, registerDebugTool } from '@/debug'

export type ZoomCause = 'fit' | 'wheel' | 'pinch' | 'other'

export interface ViewportTraceEntry {
  /** ISO timestamp. */
  readonly t: string
  readonly kind: 'zoom' | 'page'
  /** For a page entry: the lifecycle event; for a zoom entry: the cause. */
  readonly what: string
  readonly networkId?: string
  readonly zoomBefore?: number
  readonly zoomAfter?: number
  /** Number of zoom events merged into this entry (wheel gestures). */
  readonly count?: number
  /** The size cy has cached, which fit() and the pan compute with. */
  readonly cySize?: string
  /** The container's real size. */
  readonly box?: string
  readonly visibility: string
  readonly focused: boolean
  readonly detail?: string
  readonly stack?: string
}

export const TRACE_STORAGE_KEY = 'cyweb.debug.viewportTrace'
export const MAX_TRACE_ENTRIES = 300

/** A wheel event this recent (ms) is taken as the cause of a zoom. */
const WHEEL_WINDOW_MS = 150
/** Consecutive gesture zooms closer together than this (ms) merge. */
const MERGE_WINDOW_MS = 1000
/** A single zoom change below this ratio counts as a large drop. */
export const LARGE_DROP_RATIO = 0.5

// The first frames are Cytoscape.js's own emit chain: keep enough lines to
// reach the caller.
const STACK_LINES = 25

let entries: ViewportTraceEntry[] = []
let loaded = false
let pageListenersInstalled = false

// ── Buffer ────────────────────────────────────────────────────────────────────

const isEntry = (value: unknown): value is ViewportTraceEntry => {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.t === 'string' &&
    (v.kind === 'zoom' || v.kind === 'page') &&
    typeof v.what === 'string' &&
    typeof v.visibility === 'string' &&
    typeof v.focused === 'boolean'
  )
}

/**
 * Parses a stored buffer. sessionStorage is writable by any script on the
 * origin, so anything that is not an array of well-formed entries is dropped
 * rather than trusted.
 */
export const parseStoredTrace = (raw: string | null): ViewportTraceEntry[] => {
  if (raw === null) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isEntry).slice(-MAX_TRACE_ENTRIES)
  } catch {
    return []
  }
}

const loadOnce = (): void => {
  if (loaded) return
  loaded = true
  try {
    entries = parseStoredTrace(sessionStorage.getItem(TRACE_STORAGE_KEY))
  } catch {
    entries = []
  }
}

export const persistTrace = (): void => {
  try {
    sessionStorage.setItem(TRACE_STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Storage full or blocked: the in-memory buffer still has it.
  }
}

const push = (entry: ViewportTraceEntry): void => {
  entries.push(entry)
  if (entries.length > MAX_TRACE_ENTRIES) {
    entries.splice(0, entries.length - MAX_TRACE_ENTRIES)
  }
}

/** A copy of the recorded entries, oldest first. */
export const getViewportTrace = (): ViewportTraceEntry[] => {
  loadOnce()
  return [...entries]
}

export const clearViewportTrace = (): void => {
  entries = []
  loaded = true
  try {
    sessionStorage.removeItem(TRACE_STORAGE_KEY)
  } catch {
    // ignore
  }
}

const pageState = (): Pick<ViewportTraceEntry, 'visibility' | 'focused'> => ({
  visibility: document.visibilityState,
  focused: document.hasFocus(),
})

export const recordPageEvent = (what: string, detail?: string): void => {
  loadOnce()
  const last = entries.at(-1)
  // A window drag or a long burst of the same event: keep the latest only.
  if (
    last !== undefined &&
    last.kind === 'page' &&
    last.what === what &&
    Date.now() - Date.parse(last.t) < MERGE_WINDOW_MS
  ) {
    entries.pop()
  }
  push({
    t: new Date().toISOString(),
    kind: 'page',
    what,
    ...(detail !== undefined ? { detail } : {}),
    ...pageState(),
  })
}

// ── Cause tracking ────────────────────────────────────────────────────────────

interface InstanceState {
  /** > 0 while this instance's cy.fit() is on the stack. */
  fitDepth: number
  lastWheel: { time: number; ctrlKey: boolean; deltaY: number } | null
  lastZoom: number
  container: HTMLElement | null
}

const states = new WeakMap<Core, InstanceState>()

const stateOf = (cy: Core): InstanceState => {
  let state = states.get(cy)
  if (state === undefined) {
    state = {
      fitDepth: 0,
      lastWheel: null,
      lastZoom: cy.zoom(),
      container: null,
    }
    states.set(cy, state)
  }
  return state
}

export const classifyZoomCause = (
  state: Pick<InstanceState, 'fitDepth' | 'lastWheel'>,
  now: number,
): ZoomCause => {
  if (state.fitDepth > 0) return 'fit'
  const wheel = state.lastWheel
  if (wheel !== null && now - wheel.time <= WHEEL_WINDOW_MS) {
    // Chrome and Safari report a trackpad pinch as a wheel event with ctrlKey.
    return wheel.ctrlKey ? 'pinch' : 'wheel'
  }
  return 'other'
}

const formatSize = (width: number, height: number): string =>
  `${Math.round(width)}x${Math.round(height)}`

const captureStack = (): string | undefined => {
  // V8 keeps only 10 frames by default, all of them inside Cytoscape.js here.
  const ErrorWithLimit = Error as ErrorConstructor & {
    stackTraceLimit?: number
  }
  const limit = ErrorWithLimit.stackTraceLimit
  ErrorWithLimit.stackTraceLimit = 40
  const stack = new Error().stack
  ErrorWithLimit.stackTraceLimit = limit
  if (stack === undefined) return undefined
  return stack
    .split('\n')
    .slice(1)
    .filter((line) => !line.includes('viewportTrace'))
    .slice(0, STACK_LINES)
    .map((line) => line.trim())
    .join('\n')
}

const round = (value: number): number => Math.round(value * 1e6) / 1e6

const recordZoom = (cy: Core, networkId: string): void => {
  loadOnce()
  const state = stateOf(cy)
  const zoomBefore = state.lastZoom
  const zoomAfter = cy.zoom()
  state.lastZoom = zoomAfter
  // fit() emits 'zoom' even when the level did not change.
  if (zoomAfter === zoomBefore) return

  const now = Date.now()
  const cause = classifyZoomCause(state, now)
  const box =
    state.container !== null
      ? formatSize(state.container.clientWidth, state.container.clientHeight)
      : undefined
  const cySize = formatSize(cy.width(), cy.height())

  const last = entries.at(-1)
  const gesture = cause === 'wheel' || cause === 'pinch'
  if (
    gesture &&
    last !== undefined &&
    last.kind === 'zoom' &&
    last.what === cause &&
    last.networkId === networkId &&
    now - Date.parse(last.t) < MERGE_WINDOW_MS
  ) {
    entries[entries.length - 1] = {
      ...last,
      t: new Date(now).toISOString(),
      zoomAfter: round(zoomAfter),
      count: (last.count ?? 1) + 1,
      cySize,
      ...(box !== undefined ? { box } : {}),
      ...pageState(),
    }
  } else {
    const wheel = state.lastWheel
    const stack = gesture ? undefined : captureStack()
    push({
      t: new Date(now).toISOString(),
      kind: 'zoom',
      what: cause,
      networkId,
      zoomBefore: round(zoomBefore),
      zoomAfter: round(zoomAfter),
      cySize,
      ...(box !== undefined ? { box } : {}),
      ...pageState(),
      ...(gesture && wheel !== null
        ? { detail: `deltaY=${wheel.deltaY}` }
        : {}),
      ...(stack !== undefined ? { stack } : {}),
    })
  }

  const ratio = zoomBefore > 0 ? zoomAfter / zoomBefore : 1
  if (ratio < LARGE_DROP_RATIO) {
    logUi.warn(
      `[viewportTrace] zoom dropped ${zoomBefore.toFixed(4)} -> ${zoomAfter.toFixed(4)} ` +
        `by ${cause} (cy ${cySize}, box ${box ?? '?'}, ${document.visibilityState}) ` +
        'for network %s. Run debug.viewportTrace() for the timeline.',
      networkId,
    )
    persistTrace()
  }
}

/**
 * Records this instance's zoom changes for `networkId`. Call it whenever the
 * instance's listeners are (re)attached: `cy.removeAllListeners()` drops it.
 */
export const traceZoomEvents = (cy: Core, networkId: string): void => {
  const state = stateOf(cy)
  state.lastZoom = cy.zoom()
  cy.on('zoom', () => recordZoom(cy, networkId))
}

// ── Installation ──────────────────────────────────────────────────────────────

const installPageListeners = (): void => {
  if (pageListenersInstalled) return
  pageListenersInstalled = true
  loadOnce()

  const nav = performance.getEntriesByType?.('navigation')[0] as
    | PerformanceNavigationTiming
    | undefined
  const wasDiscarded =
    (document as Document & { wasDiscarded?: boolean }).wasDiscarded === true
  recordPageEvent(
    'load',
    `navigation=${nav?.type ?? '?'} wasDiscarded=${wasDiscarded} ` +
      `window=${formatSize(window.innerWidth, window.innerHeight)} ` +
      `dpr=${window.devicePixelRatio}`,
  )

  document.addEventListener('visibilitychange', () => {
    recordPageEvent(document.visibilityState)
    if (document.visibilityState === 'hidden') persistTrace()
  })
  document.addEventListener('freeze', () => {
    recordPageEvent('freeze')
    persistTrace()
  })
  document.addEventListener('resume', () => recordPageEvent('resume'))
  window.addEventListener('pageshow', (event) =>
    recordPageEvent('pageshow', `persisted=${event.persisted}`),
  )
  window.addEventListener('pagehide', () => {
    recordPageEvent('pagehide')
    persistTrace()
  })
  window.addEventListener('focus', () => recordPageEvent('focus'))
  window.addEventListener('blur', () => recordPageEvent('blur'))
  window.addEventListener('resize', () =>
    recordPageEvent(
      'resize',
      `window=${formatSize(window.innerWidth, window.innerHeight)}`,
    ),
  )

  // devicePixelRatio changes when the window moves between a Retina and a
  // non-Retina display (lid closed with an external monitor attached).
  const watchDpr = (): void => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia(
      `(resolution: ${window.devicePixelRatio}dppx)`,
    )
    query.addEventListener?.(
      'change',
      () => {
        recordPageEvent('dpr', `dpr=${window.devicePixelRatio}`)
        watchDpr()
      },
      { once: true },
    )
  }
  watchDpr()
}

type Fit = Core['fit']

/**
 * Starts recording for one Cytoscape.js instance: marks zooms made inside its
 * `fit()`, notes wheel/pinch events on its container, and records page
 * lifecycle events. Returns a function that removes the instance hooks.
 */
export const installViewportTrace = (
  cy: Core,
  container: HTMLElement | null,
): (() => void) => {
  installPageListeners()
  const state = stateOf(cy)
  state.container = container

  const target = cy as Core & { fit: Fit }
  const hadOwnFit = Object.prototype.hasOwnProperty.call(target, 'fit')
  const nativeFit = target.fit
  const tracedFit = function tracedFit(this: Core, ...args: Parameters<Fit>) {
    state.fitDepth += 1
    try {
      return nativeFit.apply(cy, args)
    } finally {
      state.fitDepth -= 1
    }
  } as Fit
  target.fit = tracedFit

  const onWheel = (event: WheelEvent): void => {
    state.lastWheel = {
      time: Date.now(),
      ctrlKey: event.ctrlKey,
      deltaY: Math.round(event.deltaY * 100) / 100,
    }
  }
  // Capture phase: Cytoscape.js handles the wheel on its own canvas child.
  container?.addEventListener('wheel', onWheel, {
    capture: true,
    passive: true,
  })

  return () => {
    container?.removeEventListener('wheel', onWheel, { capture: true })
    // Only when still on top: unwinding a wrapper installed later would drop it.
    if (target.fit === tracedFit) {
      if (hadOwnFit) {
        target.fit = nativeFit
      } else {
        delete (target as Partial<typeof target>).fit
      }
    }
    state.container = null
  }
}

/**
 * Records the zoom history of the main network view (see the file header).
 * Zoom events themselves are attached by `traceZoomEvents` in renderNetwork,
 * because that function removes all of the instance's listeners.
 */
export const useViewportTrace = (
  cy: Core | null,
  containerRef: RefObject<HTMLElement | null>,
): void => {
  useEffect(() => {
    if (cy === null) return
    const uninstall = installViewportTrace(cy, containerRef.current)
    const unregister = registerDebugTool('viewportTrace', getViewportTrace)
    const unregisterClear = registerDebugTool(
      'clearViewportTrace',
      clearViewportTrace,
    )
    return () => {
      unregisterClear()
      unregister()
      uninstall()
    }
  }, [cy, containerRef])
}

/** Test-only: forget the module state. */
export const resetViewportTraceForTests = (): void => {
  entries = []
  loaded = false
}
