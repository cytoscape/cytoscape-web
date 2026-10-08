import debug from 'debug'
import hotkeys from 'hotkeys-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { initializeDebug, isDebugEnabled, registerDebugTool } from '@/debug'

describe('debug mode', () => {
  let cleanup: (() => void) | undefined

  beforeEach(() => {
    localStorage.clear()
    debug.disable()
  })

  afterEach(() => {
    cleanup?.()
    cleanup = undefined
    vi.restoreAllMocks()
  })

  it('defaults to enabled for debug builds', () => {
    cleanup = initializeDebug({
      defaultEnabled: true,
      enableRenderTracking: false,
    })

    expect(isDebugEnabled()).toBe(true)
    expect(debug.enabled('store:info')).toBe(true)
  })

  it('defaults to disabled for production builds', () => {
    cleanup = initializeDebug({
      defaultEnabled: false,
      enableRenderTracking: false,
    })

    expect(isDebugEnabled()).toBe(false)
    expect(debug.enabled('store:info')).toBe(false)
  })

  it('preserves an explicit user override across initialization', () => {
    localStorage.setItem('cyweb-debug-enabled', 'false')

    cleanup = initializeDebug({
      defaultEnabled: true,
      enableRenderTracking: false,
    })

    expect(isDebugEnabled()).toBe(false)
  })

  it.each(['`', 'shift+`'])('toggles debug mode with the %s key', (key) => {
    cleanup = initializeDebug({
      defaultEnabled: false,
      enableRenderTracking: false,
    })

    hotkeys.trigger(key)
    expect(isDebugEnabled()).toBe(true)
    expect(localStorage.getItem('cyweb-debug-enabled')).toBe('true')

    hotkeys.trigger(key)
    expect(isDebugEnabled()).toBe(false)
    expect(localStorage.getItem('cyweb-debug-enabled')).toBe('false')
  })

  it('adds and removes registered developer tools as debug mode changes', () => {
    const tool = { inspect: vi.fn() }
    const unregister = registerDebugTool('testTool', tool)
    cleanup = initializeDebug({
      defaultEnabled: false,
      enableRenderTracking: false,
    })

    expect(window.debug.testTool).toBeUndefined()

    hotkeys.trigger('`')
    expect(window.debug.testTool).toBe(tool)

    hotkeys.trigger('`')
    expect(window.debug.testTool).toBeUndefined()
    unregister()
  })
})
