import debug from 'debug'
import hotkeys from 'hotkeys-js'

const DEBUG_OVERRIDE_KEY = 'cyweb-debug-enabled'
const DEBUG_SHORTCUT = '`,shift+`'

type InitializeDebugOptions = {
  defaultEnabled?: boolean
  enableRenderTracking?: boolean
}

let debugEnabled = false
const debugListeners = new Set<() => void>()
const debugTools = new Map<string, unknown>()

function syncDebugTools(): void {
  window.debug ??= {}
  for (const [name, value] of debugTools) {
    if (debugEnabled) {
      window.debug[name] = value
    } else {
      delete window.debug[name]
    }
  }
}

function readDebugOverride(): boolean | undefined {
  const value = localStorage.getItem(DEBUG_OVERRIDE_KEY)
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

function setDebugEnabled(enabled: boolean, persist: boolean): void {
  debugEnabled = enabled
  if (persist) {
    localStorage.setItem(DEBUG_OVERRIDE_KEY, String(enabled))
  }

  if (enabled) {
    debug.enable('*')
    window.debug ??= {}
  } else {
    debug.disable()
  }

  syncDebugTools()
  debugListeners.forEach((listener) => listener())
}

/**
 * Debug namespace types for organizing debug logs by feature area
 */
export const DebugNamespaceType = {
  DB: 'db',
  STORE: 'store',
  API: 'api',
  APP: 'app',
  UI: 'ui',
  STARTUP: 'startup',
  PERFORMANCE: 'performance',
  HISTORY: 'history',
  MODEL: 'model',
} as const

export type DebugNamespaceType =
  (typeof DebugNamespaceType)[keyof typeof DebugNamespaceType]

/**
 * Creates logger functions (info, warn, error) for a given namespace
 * @param namespace - The debug namespace (e.g., 'db', 'store', 'api')
 * @returns Object with info, warn, and error logger functions
 */
function createLoggers(namespace: DebugNamespaceType) {
  return {
    info: debug(`${namespace}:info`),
    warn: debug(`${namespace}:warn`),
    error: debug(`${namespace}:error`),
  }
}

export const logDb = createLoggers(DebugNamespaceType.DB)
export const logStore = createLoggers(DebugNamespaceType.STORE)
export const logApi = createLoggers(DebugNamespaceType.API)
export const logApp = createLoggers(DebugNamespaceType.APP)
export const logUi = createLoggers(DebugNamespaceType.UI)
export const logStartup = createLoggers(DebugNamespaceType.STARTUP)
export const logPerformance = createLoggers(DebugNamespaceType.PERFORMANCE)
export const logHistory = createLoggers(DebugNamespaceType.HISTORY)
export const logModel = createLoggers(DebugNamespaceType.MODEL)

export const isDebugEnabled = (): boolean => debugEnabled

export const subscribeDebug = (listener: () => void): (() => void) => {
  debugListeners.add(listener)
  return () => debugListeners.delete(listener)
}

export const registerDebugTool = (
  name: string,
  value: unknown,
): (() => void) => {
  debugTools.set(name, value)
  syncDebugTools()

  return () => {
    debugTools.delete(name)
    if (window.debug !== undefined) {
      delete window.debug[name]
    }
  }
}

/**
 * Initializes debug logging from the persisted user choice or build default.
 * Pressing backtick/tilde toggles the setting immediately and persists it.
 */
export const initializeDebug = (
  options: InitializeDebugOptions = {},
): (() => void) => {
  const defaultEnabled = options.defaultEnabled ?? import.meta.env.DEV
  setDebugEnabled(readDebugOverride() ?? defaultEnabled, false)

  const toggleDebug = (): void => {
    setDebugEnabled(!debugEnabled, true)
  }

  hotkeys(DEBUG_SHORTCUT, toggleDebug)

  // This branch is compiled away in production, including the profiler import.
  if (import.meta.env.DEV && options.enableRenderTracking !== false) {
    void Promise.all([
      import('@welldone-software/why-did-you-render'),
      import('react'),
    ]).then(([{ default: whyDidYouRender }, { default: React }]) => {
      whyDidYouRender(React, { trackAllPureComponents: false })
    })
  }

  return () => hotkeys.unbind(DEBUG_SHORTCUT, toggleDebug)
}
