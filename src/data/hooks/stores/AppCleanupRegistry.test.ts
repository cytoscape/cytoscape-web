// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

// src/data/hooks/stores/AppCleanupRegistry.test.ts
import {
  _resetCleanupRegistry,
  cleanupAllForApp,
  registerAppCleanup,
} from './AppCleanupRegistry'

describe('AppCleanupRegistry', () => {
  beforeEach(() => {
    _resetCleanupRegistry()
  })

  it('calls all registered cleanup functions with the appId', () => {
    const fn1 = vi.fn()
    const fn2 = vi.fn()
    registerAppCleanup(fn1)
    registerAppCleanup(fn2)

    cleanupAllForApp('app1')

    expect(fn1).toHaveBeenCalledWith('app1')
    expect(fn2).toHaveBeenCalledWith('app1')
  })

  it('does not throw when no cleanup functions are registered', () => {
    expect(() => cleanupAllForApp('app1')).not.toThrow()
  })

  it('continues calling remaining functions when one throws', () => {
    const fn1 = vi.fn()
    const fn2 = vi.fn().mockImplementation(() => {
      throw new Error('cleanup2 failed')
    })
    const fn3 = vi.fn()
    registerAppCleanup(fn1)
    registerAppCleanup(fn2)
    registerAppCleanup(fn3)

    // Should not throw even though fn2 throws
    expect(() => cleanupAllForApp('app1')).not.toThrow()

    expect(fn1).toHaveBeenCalledWith('app1')
    expect(fn2).toHaveBeenCalledWith('app1')
    expect(fn3).toHaveBeenCalledWith('app1')
  })

  it('calls each function once per cleanupAllForApp invocation', () => {
    const fn = vi.fn()
    registerAppCleanup(fn)

    cleanupAllForApp('app1')
    cleanupAllForApp('app2')

    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenNthCalledWith(1, 'app1')
    expect(fn).toHaveBeenNthCalledWith(2, 'app2')
  })

  it('supports multiple registrations from different stores', () => {
    const resourceCleanup = vi.fn()
    const contextMenuCleanup = vi.fn()
    const futureStoreCleanup = vi.fn()

    registerAppCleanup(resourceCleanup)
    registerAppCleanup(contextMenuCleanup)
    registerAppCleanup(futureStoreCleanup)

    cleanupAllForApp('myApp')

    expect(resourceCleanup).toHaveBeenCalledWith('myApp')
    expect(contextMenuCleanup).toHaveBeenCalledWith('myApp')
    expect(futureStoreCleanup).toHaveBeenCalledWith('myApp')
  })
})
