// src/data/hooks/stores/useAppManager.lifecycle.test.ts
//
// Plain Jest unit tests for the lifecycle helper functions in appLifecycle.ts.
// These helpers are extracted from useAppManager to avoid the top-level await
// that makes renderHook-based testing complex.

import type { CyWebApiType } from '../../../app-api/core'
import type { AppContext } from '../../../app-api/types/AppContext'
import type { CyApp } from '../../../models/AppModel/CyApp'
import {
  _resetCleanupRegistry,
  registerAppCleanup,
} from './AppCleanupRegistry'
import { mountApp, unmountAllApps, unmountApp } from './appLifecycle'

// Minimal stub — tests only check that mount/unmount receive the apis object
const mockApi = {} as CyWebApiType

// Helper: build a minimal CyApp, optionally with lifecycle methods
function makeApp(
  id: string,
  extra?: { mount?: jest.Mock; unmount?: jest.Mock },
): CyApp {
  return { id, name: id, components: [], ...(extra ?? {}) } as CyApp
}

// ─── mountApp ────────────────────────────────────────────────────────────────

describe('mountApp', () => {
  let mountedApps: Set<string>

  beforeEach(() => {
    mountedApps = new Set()
    _resetCleanupRegistry()
  })

  it('calls mount() with correct AppContext when app implements lifecycle', async () => {
    const mountFn = jest.fn()
    const app = makeApp('app1', { mount: mountFn })
    const ctx: AppContext = { appId: 'app1', apis: mockApi }

    await mountApp(app, ctx, mountedApps)

    expect(mountFn).toHaveBeenCalledTimes(1)
    expect(mountFn).toHaveBeenCalledWith(ctx)
    expect(mountedApps.has('app1')).toBe(true)
  })

  it('adds plain apps without lifecycle to mountedApps immediately (backward-compatible)', async () => {
    const app = makeApp('plain')
    await mountApp(app, { appId: 'plain', apis: mockApi }, mountedApps)

    // Apps without mount() are treated as mounted immediately
    expect(mountedApps.has('plain')).toBe(true)
  })

  it('awaits async mount() before resolving', async () => {
    const order: string[] = []
    const mountFn = jest.fn().mockImplementation(async () => {
      order.push('mount-start')
      await Promise.resolve()
      order.push('mount-end')
    })
    const app = makeApp('async-app', { mount: mountFn })

    await mountApp(app, { appId: 'async-app', apis: mockApi }, mountedApps)
    order.push('after-mountApp')

    expect(order).toEqual(['mount-start', 'mount-end', 'after-mountApp'])
    expect(mountedApps.has('async-app')).toBe(true)
  })

  it('propagates mount() errors, runs cleanupAllForApp, and does NOT record the app', async () => {
    const cleanupSpy = jest.fn()
    registerAppCleanup(cleanupSpy)

    const mountFn = jest.fn().mockRejectedValue(new Error('mount failed'))
    const app = makeApp('err-app', { mount: mountFn })

    await expect(
      mountApp(app, { appId: 'err-app', apis: mockApi }, mountedApps),
    ).rejects.toThrow('mount failed')

    expect(mountedApps.has('err-app')).toBe(false)
    expect(cleanupSpy).toHaveBeenCalledWith('err-app')
  })

  it('does not call cleanupAllForApp when mount() succeeds', async () => {
    const cleanupSpy = jest.fn()
    registerAppCleanup(cleanupSpy)

    const mountFn = jest.fn()
    const app = makeApp('ok-app', { mount: mountFn })
    await mountApp(app, { appId: 'ok-app', apis: mockApi }, mountedApps)

    expect(cleanupSpy).not.toHaveBeenCalled()
  })
})

// ─── unmountApp ──────────────────────────────────────────────────────────────

describe('unmountApp', () => {
  let mountedApps: Set<string>

  beforeEach(() => {
    mountedApps = new Set()
    _resetCleanupRegistry()
  })

  it('calls cleanupAllForApp BEFORE unmount()', async () => {
    const order: string[] = []
    registerAppCleanup(() => order.push('cleanup'))
    const unmountFn = jest.fn().mockImplementation(() => order.push('unmount'))
    const app = makeApp('order-test', { unmount: unmountFn })
    mountedApps.add('order-test')

    await unmountApp(app, mountedApps)

    expect(order).toEqual(['cleanup', 'unmount'])
  })

  it('calls unmount() when app was previously mounted', async () => {
    const unmountFn = jest.fn()
    const app = makeApp('b1', { unmount: unmountFn })
    mountedApps.add('b1')

    await unmountApp(app, mountedApps)

    expect(unmountFn).toHaveBeenCalledTimes(1)
    expect(mountedApps.has('b1')).toBe(false)
  })

  it('does NOT call unmount() when app was never mounted', async () => {
    const unmountFn = jest.fn()
    const app = makeApp('never', { unmount: unmountFn })

    await unmountApp(app, mountedApps)

    expect(unmountFn).not.toHaveBeenCalled()
    expect(mountedApps.has('never')).toBe(false)
  })

  it('removes app from mountedApps even when unmount() is not defined', async () => {
    const app = makeApp('no-unmount')
    mountedApps.add('no-unmount')

    await unmountApp(app, mountedApps)

    expect(mountedApps.has('no-unmount')).toBe(false)
  })

  it('swallows unmount() errors and still removes the app from mountedApps', async () => {
    const unmountFn = jest.fn().mockRejectedValue(new Error('unmount failed'))
    const app = makeApp('err-app', { unmount: unmountFn })
    mountedApps.add('err-app')

    await expect(unmountApp(app, mountedApps)).resolves.toBeUndefined()

    expect(mountedApps.has('err-app')).toBe(false)
  })

  it('is idempotent — second call is a no-op', async () => {
    const unmountFn = jest.fn()
    const app = makeApp('idem', { unmount: unmountFn })
    mountedApps.add('idem')

    await unmountApp(app, mountedApps)
    await unmountApp(app, mountedApps)

    expect(unmountFn).toHaveBeenCalledTimes(1)
  })
})

// ─── unmountAllApps ──────────────────────────────────────────────────────────

describe('unmountAllApps', () => {
  let mountedApps: Set<string>

  beforeEach(() => {
    mountedApps = new Set()
  })

  it('calls unmount() on all mounted apps (simulates beforeunload)', async () => {
    const unmount1 = jest.fn()
    const unmount2 = jest.fn()
    const app1 = makeApp('c1', { unmount: unmount1 })
    const app2 = makeApp('c2', { unmount: unmount2 })
    const registry = new Map<string, CyApp>([
      ['c1', app1],
      ['c2', app2],
    ])
    mountedApps.add('c1')
    mountedApps.add('c2')

    await unmountAllApps(registry, mountedApps)

    expect(unmount1).toHaveBeenCalledTimes(1)
    expect(unmount2).toHaveBeenCalledTimes(1)
    expect(mountedApps.size).toBe(0)
  })

  it('does NOT call unmount() for apps that were never mounted', async () => {
    const unmountFn = jest.fn()
    const app = makeApp('d1', { unmount: unmountFn })
    const registry = new Map<string, CyApp>([['d1', app]])
    // mountedApps is empty — app was never mounted

    await unmountAllApps(registry, mountedApps)

    expect(unmountFn).not.toHaveBeenCalled()
  })

  it('handles missing app entries in registry gracefully', async () => {
    mountedApps.add('ghost')
    const registry = new Map<string, CyApp>() // ghost not in registry

    await expect(unmountAllApps(registry, mountedApps)).resolves.toBeUndefined()
    expect(mountedApps.has('ghost')).toBe(false)
  })

  it('is a no-op when mountedApps is empty', async () => {
    const unmountFn = jest.fn()
    const app = makeApp('e1', { unmount: unmountFn })
    const registry = new Map<string, CyApp>([['e1', app]])

    await unmountAllApps(registry, mountedApps)

    expect(unmountFn).not.toHaveBeenCalled()
  })
})
