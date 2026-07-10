import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { __resetRemoteState, __setRuntime, loadModule } from './ExternalComponent'

// A fake Module Federation runtime: registerRemotes records the remotes, and
// loadRemote returns whatever the test queued for a given id.
function makeFakeRuntime(modules: Record<string, unknown>) {
  const registered: Array<{ name: string; entry: string; type?: string }> = []
  return {
    registered,
    registerRemotes: vi.fn(
      (remotes: Array<{ name: string; entry: string; type?: string }>) => {
        registered.push(...remotes)
      },
    ),
    loadRemote: vi.fn((id: string) =>
      Promise.resolve(id in modules ? modules[id] : null),
    ),
  }
}

describe('ExternalComponent MF-runtime loader', () => {
  beforeEach(() => {
    __resetRemoteState()
  })
  afterEach(() => {
    __resetRemoteState()
  })

  it('registers the remote as an ESM module and loads <scope>/<expose>', async () => {
    const appModule = { default: { id: 'scopeA' } }
    const fake = makeFakeRuntime({ 'scopeA/AppConfig': appModule })
    __setRuntime(fake as never)

    const mod = await loadModule(
      'scopeA',
      './AppConfig',
      'http://remote/remoteEntry.js',
    )

    expect(fake.registerRemotes).toHaveBeenCalledWith(
      [{ name: 'scopeA', entry: 'http://remote/remoteEntry.js', type: 'module' }],
      { force: true },
    )
    // The './' expose prefix is stripped for the runtime's <scope>/<expose> id.
    expect(fake.loadRemote).toHaveBeenCalledWith('scopeA/AppConfig')
    expect(mod).toBe(appModule)
  })

  it('registers a remote only once per scope+url', async () => {
    const fake = makeFakeRuntime({ 'scopeA/AppConfig': {} })
    __setRuntime(fake as never)

    await loadModule('scopeA', './AppConfig', 'http://remote/remoteEntry.js')
    await loadModule('scopeA', './AppConfig', 'http://remote/remoteEntry.js')

    expect(fake.registerRemotes).toHaveBeenCalledTimes(1)
    expect(fake.loadRemote).toHaveBeenCalledTimes(2)
  })

  it('reuses the registered URL when none is passed on later calls', async () => {
    const fake = makeFakeRuntime({ 'scopeA/AppConfig': {}, 'scopeA/Other': {} })
    __setRuntime(fake as never)

    await loadModule('scopeA', './AppConfig', 'http://remote/remoteEntry.js')
    await loadModule('scopeA', './Other')

    expect(fake.loadRemote).toHaveBeenLastCalledWith('scopeA/Other')
  })

  it('throws when the runtime returns null (module not found)', async () => {
    const fake = makeFakeRuntime({})
    __setRuntime(fake as never)

    await expect(
      loadModule('scopeA', './AppConfig', 'http://remote/remoteEntry.js'),
    ).rejects.toThrow(/Failed to load remote module "scopeA\/AppConfig"/)
  })

  it('throws when no URL is known for the scope', async () => {
    const fake = makeFakeRuntime({})
    __setRuntime(fake as never)

    await expect(loadModule('unknownScope', './AppConfig')).rejects.toThrow(
      /Missing remote entry URL/,
    )
  })
})
