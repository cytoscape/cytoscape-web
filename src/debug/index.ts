import debug from 'debug'
import config from '../assets/config.json'

export const DebugNamespaceType = {
  DB: 'db',
  STORE: 'store',
  API: 'api',
  APP: 'app',
  UI: 'ui',
  STARTUP: 'startup',
  PERFORMANCE: 'performance',
} as const

export type DebugNamespaceType =
  (typeof DebugNamespaceType)[keyof typeof DebugNamespaceType]

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

export const initializeDebug = (): void => {
  // Enable all debug namespaces if debug mode is enabled in config
  if (config.debug) {
    localStorage.debug = '*'
  }
  console.log(
    config.debug
      ? '[DEBUG] Debug mode is enabled'
      : '[DEBUG] Debug mode is disabled',
  )
}
