// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CyApp } from '../../../models/AppModel/CyApp'
import { loadModule } from '../ExternalComponent'
import { loadRemoteApp } from './loadRemoteApp'

vi.mock('../ExternalComponent', () => ({
  loadModule: vi.fn(),
}))

const mockedLoadModule = vi.mocked(loadModule)

const URL = 'http://localhost:2222/remoteEntry.js'

describe('loadRemoteApp', () => {
  let appRegistry: Map<string, CyApp>
  const remoteApp = {
    id: 'myApp',
    name: 'My App',
    description: 'test app',
    version: '1.0.0',
    author: 'Test',
    components: [],
  } as unknown as CyApp

  beforeEach(() => {
    appRegistry = new Map()
    mockedLoadModule.mockReset()
  })

  it('loads AppConfig through Module Federation and registers the app', async () => {
    mockedLoadModule.mockResolvedValue({ default: remoteApp })

    const result = await loadRemoteApp('myApp', URL, appRegistry)

    expect(mockedLoadModule).toHaveBeenCalledWith('myApp', './AppConfig', URL)
    expect(result).toEqual({ ok: true, app: remoteApp })
    expect(appRegistry.get('myApp')).toBe(remoteApp)
  })

  // #719: each failure returns its own code, so the caller can store a reason
  // instead of an undefined it cannot interpret.
  it('reports id-mismatch with both ids when the bundle id differs', async () => {
    mockedLoadModule.mockResolvedValue({
      default: { ...remoteApp, id: 'differentApp' },
    })

    const result = await loadRemoteApp('myApp', URL, appRegistry)

    expect(result).toEqual({
      ok: false,
      failure: {
        code: 'id-mismatch',
        url: URL,
        expected: 'myApp',
        received: 'differentApp',
      },
    })
    expect(appRegistry.size).toBe(0)
  })

  it('reports id-mismatch for a case-only difference', async () => {
    // The reproduction in #719: catalog id `chrisapp`, bundle id `chrisApp`.
    // The compare stays strict because the two ids key different maps.
    mockedLoadModule.mockResolvedValue({
      default: { ...remoteApp, id: 'chrisApp' },
    })

    const result = await loadRemoteApp('chrisapp', URL, appRegistry)

    expect(result).toEqual({
      ok: false,
      failure: {
        code: 'id-mismatch',
        url: URL,
        expected: 'chrisapp',
        received: 'chrisApp',
      },
    })
    expect(appRegistry.size).toBe(0)
  })

  it('reports no-app-config when the AppConfig module has no default export', async () => {
    mockedLoadModule.mockResolvedValue({})

    const result = await loadRemoteApp('myApp', URL, appRegistry)

    expect(result).toEqual({
      ok: false,
      failure: { code: 'no-app-config', url: URL },
    })
    expect(appRegistry.size).toBe(0)
  })

  it('reports no-app-config when loadModule resolves undefined', async () => {
    mockedLoadModule.mockResolvedValue(undefined)

    const result = await loadRemoteApp('myApp', URL, appRegistry)

    expect(result).toEqual({
      ok: false,
      failure: { code: 'no-app-config', url: URL },
    })
    expect(appRegistry.size).toBe(0)
  })

  it('reports no-app-config when loadModule resolves null', async () => {
    mockedLoadModule.mockResolvedValue(null)

    const result = await loadRemoteApp('myApp', URL, appRegistry)

    expect(result).toEqual({
      ok: false,
      failure: { code: 'no-app-config', url: URL },
    })
    expect(appRegistry.size).toBe(0)
  })

  it('reports fetch-failed with the thrown message when loadModule rejects', async () => {
    mockedLoadModule.mockRejectedValue(new Error('network error'))

    const result = await loadRemoteApp('myApp', URL, appRegistry)

    expect(result).toEqual({
      ok: false,
      failure: { code: 'fetch-failed', url: URL, message: 'network error' },
    })
    expect(appRegistry.size).toBe(0)
  })

  it('stringifies a non-Error rejection', async () => {
    mockedLoadModule.mockRejectedValue('boom')

    const result = await loadRemoteApp('myApp', URL, appRegistry)

    expect(result).toEqual({
      ok: false,
      failure: { code: 'fetch-failed', url: URL, message: 'boom' },
    })
  })
})
