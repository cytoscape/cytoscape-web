// Tests for the pure CyApp mount/unmount helpers (extracted from
// useAppManager specifically so they can be unit-tested — see the
// module header in appLifecycle.ts).

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AppContext } from '../../../app-api/types/AppContext'
import type { CyApp } from '../../../models/AppModel/CyApp'
import {
  _resetCleanupRegistry,
  registerAppCleanup,
} from './AppCleanupRegistry'
import { mountApp, unmountAllApps, unmountApp } from './appLifecycle'

const context = {} as AppContext

const makeApp = (
  id: string,
  lifecycle?: {
    mount?: (context: AppContext) => void | Promise<void>
    unmount?: () => void | Promise<void>
  },
): CyApp => ({ id, name: id, ...lifecycle }) as CyApp

describe('mountApp', () => {
  beforeEach(() => {
    _resetCleanupRegistry()
  })

  it('treats an app without mount() as mounted immediately', async () => {
    const mountedApps = new Set<string>()

    await mountApp(makeApp('plain'), context, mountedApps)

    expect(mountedApps.has('plain')).toBe(true)
  })

  it('calls mount() with the app context and records the app as mounted', async () => {
    const mount = vi.fn().mockResolvedValue(undefined)
    const mountedApps = new Set<string>()

    await mountApp(makeApp('with-mount', { mount }), context, mountedApps)

    expect(mount).toHaveBeenCalledWith(context)
    expect(mountedApps.has('with-mount')).toBe(true)
  })

  it('on mount() failure: cleans up partial registrations, does not mark mounted, re-throws', async () => {
    const cleanup = vi.fn()
    registerAppCleanup(cleanup)
    const mount = vi.fn().mockRejectedValue(new Error('boom'))
    const mountedApps = new Set<string>()

    await expect(
      mountApp(makeApp('failing', { mount }), context, mountedApps),
    ).rejects.toThrow('boom')

    expect(cleanup).toHaveBeenCalledWith('failing')
    expect(mountedApps.has('failing')).toBe(false)
  })
})

describe('unmountApp', () => {
  beforeEach(() => {
    _resetCleanupRegistry()
  })

  it('is a no-op for an app that was never mounted', async () => {
    const cleanup = vi.fn()
    registerAppCleanup(cleanup)
    const unmount = vi.fn()

    await unmountApp(makeApp('never-mounted', { unmount }), new Set())

    expect(cleanup).not.toHaveBeenCalled()
    expect(unmount).not.toHaveBeenCalled()
  })

  it('runs host-owned cleanup BEFORE the app unmount() callback', async () => {
    const order: string[] = []
    registerAppCleanup(() => order.push('cleanup'))
    const unmount = vi.fn(() => {
      order.push('unmount')
    })
    const mountedApps = new Set(['app-1'])

    await unmountApp(makeApp('app-1', { unmount }), mountedApps)

    expect(order).toEqual(['cleanup', 'unmount'])
    expect(mountedApps.has('app-1')).toBe(false)
  })

  it('still cleans up and unregisters an app without unmount()', async () => {
    const cleanup = vi.fn()
    registerAppCleanup(cleanup)
    const mountedApps = new Set(['plain'])

    await unmountApp(makeApp('plain'), mountedApps)

    expect(cleanup).toHaveBeenCalledWith('plain')
    expect(mountedApps.has('plain')).toBe(false)
  })

  it('swallows unmount() errors so callers always complete cleanup', async () => {
    const cleanup = vi.fn()
    registerAppCleanup(cleanup)
    const unmount = vi.fn().mockRejectedValue(new Error('unmount failed'))
    const mountedApps = new Set(['flaky'])

    await expect(
      unmountApp(makeApp('flaky', { unmount }), mountedApps),
    ).resolves.toBeUndefined()

    expect(cleanup).toHaveBeenCalledWith('flaky')
    expect(mountedApps.has('flaky')).toBe(false)
  })

  it('a second unmount is a no-op even after the first unmount() threw', async () => {
    const unmount = vi.fn().mockRejectedValue(new Error('unmount failed'))
    const app = makeApp('flaky', { unmount })
    const mountedApps = new Set(['flaky'])

    await unmountApp(app, mountedApps)
    await unmountApp(app, mountedApps)

    expect(unmount).toHaveBeenCalledTimes(1)
  })
})

describe('unmountAllApps', () => {
  beforeEach(() => {
    _resetCleanupRegistry()
  })

  it('unmounts every mounted app and clears stale IDs missing from the registry', async () => {
    const unmountA = vi.fn()
    const unmountB = vi.fn()
    const appRegistry = new Map<string, CyApp>([
      ['a', makeApp('a', { unmount: unmountA })],
      ['b', makeApp('b', { unmount: unmountB })],
    ])
    // 'ghost' is mounted but no longer in the registry
    const mountedApps = new Set(['a', 'b', 'ghost'])

    await unmountAllApps(appRegistry, mountedApps)

    expect(unmountA).toHaveBeenCalledTimes(1)
    expect(unmountB).toHaveBeenCalledTimes(1)
    expect(mountedApps.size).toBe(0)
  })
})
