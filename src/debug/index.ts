import debug from 'debug'
import whyDidYouRender from '@welldone-software/why-did-you-render'
import React from 'react'

import config from '../assets/config.json'

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
