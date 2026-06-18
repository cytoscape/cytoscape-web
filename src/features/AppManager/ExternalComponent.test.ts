import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  __resetRemoteState,
  __setImportRemoteEntry,
  loadModule,
  loadRemoteEntry,
} from './ExternalComponent'

// Builds a fake Module Federation container exposing the given modules.
function makeContainer(modules: Record<string, () => unknown>) {
  return {
    init: vi.fn(),
    get: vi.fn((name: string) => {
      const factory = modules[name]
      if (factory === undefined) {
        return Promise.reject(new Error(`no module ${name}`))
      }
      return Promise.resolve(factory)
    }),
  }
}

describe('ExternalComponent ESM loader', () => {
  beforeEach(() => {
    __resetRemoteState()
  })
  afterEach(() => {
    __resetRemoteState()
  })

  it('imports the remoteEntry as ESM, initializes, and returns the container', async () => {
    const container = makeContainer({})
    const importer = vi.fn().mockResolvedValue(container)
    __setImportRemoteEntry(importer)

    const result = await loadRemoteEntry('http://remote/remoteEntry.js', 'scopeA')

    expect(importer).toHaveBeenCalledWith('http://remote/remoteEntry.js')
    expect(container.init).toHaveBeenCalledTimes(1)
    expect(result).toBe(container)
  })

  it('loadModule resolves the factory result from the container', async () => {
    const appModule = { default: { id: 'scopeA' } }
    const container = makeContainer({ './AppConfig': () => appModule })
    __setImportRemoteEntry(vi.fn().mockResolvedValue(container))

    const mod = await loadModule('scopeA', './AppConfig', 'http://remote/remoteEntry.js')

    expect(container.get).toHaveBeenCalledWith('./AppConfig')
    expect(mod).toBe(appModule)
  })

  it('caches the container per scope+url (imports once)', async () => {
    const container = makeContainer({ './AppConfig': () => ({}) })
    const importer = vi.fn().mockResolvedValue(container)
    __setImportRemoteEntry(importer)

    await loadModule('scopeA', './AppConfig', 'http://remote/remoteEntry.js')
    await loadModule('scopeA', './AppConfig', 'http://remote/remoteEntry.js')

    expect(importer).toHaveBeenCalledTimes(1)
    expect(container.init).toHaveBeenCalledTimes(1)
  })

  it('rejects when the remoteEntry namespace is not a federation container', async () => {
    __setImportRemoteEntry(vi.fn().mockResolvedValue({ notAContainer: true }))

    await expect(
      loadRemoteEntry('http://remote/remoteEntry.js', 'scopeA'),
    ).rejects.toThrow(/does not export a Module Federation container/)
  })

  it('does not cache a failed import (allows retry)', async () => {
    const importer = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(makeContainer({}))
    __setImportRemoteEntry(importer)

    await expect(
      loadRemoteEntry('http://remote/remoteEntry.js', 'scopeA'),
    ).rejects.toThrow('network')

    // Second attempt should re-import rather than return the cached rejection.
    await expect(
      loadRemoteEntry('http://remote/remoteEntry.js', 'scopeA'),
    ).resolves.toBeDefined()
    expect(importer).toHaveBeenCalledTimes(2)
  })

  it('throws when no URL is known for the scope', async () => {
    await expect(loadModule('unknownScope', './AppConfig')).rejects.toThrow(
      /Missing remote entry URL/,
    )
  })
})
