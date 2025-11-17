import whyDidYouRender from '@welldone-software/why-did-you-render'
import debug from 'debug'
import React from 'react'

import config from './assets/config.json'

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

/**
 * Initializes debug logging and React component debugging
 * Enables debug logging if debug mode is enabled in config
 * Sets up why-did-you-render for React component debugging
 */
export const initializeDebug = (): void => {
  // Enable all debug namespaces if debug mode is enabled in config
  if (config.debug) {
    localStorage.debug = '*'
    window.debug = {}

    whyDidYouRender(React, { trackAllPureComponents: false })
  }
  console.log(
    config.debug
      ? '[DEBUG] Debug mode is enabled'
      : '[DEBUG] Debug mode is disabled',
  )
}
