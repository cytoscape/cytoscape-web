import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement, ReactNode } from 'react'

import { AppConfigContext, defaultAppConfig } from '../../../AppConfigContext'
import {
  isAllowedOrigin,
  isCatalogEntryAllowed,
  isHostCompatible,
} from '../../../features/AppManager/install/installGate'
import { migrateLegacyApps } from '../../../features/AppManager/install/migrateLegacyApps'
import { loadRemoteApp } from '../../../features/AppManager/loader/loadRemoteApp'
import { AppCatalogEntry } from '../../../models/AppModel/AppCatalogEntry'
import { AppStatus } from '../../../models/AppModel/AppStatus'
import { InstalledApp } from '../../../models/AppModel/InstalledApp'
import { getAppSettingFromDb } from '../../db'
import { mountApp, unmountApp } from './appLifecycle'
import { useAppStore } from './AppStore'
import { useMessageStore } from './MessageStore'
import { appRegistry, useAppManager } from './useAppManager'
import { useWorkspaceStore } from './WorkspaceStore'

// Stub the app-api/core barrel — its layout API transitively imports the
// ESM-only @cosmos.gl/graph, which jest cannot transform. useAppManager only
// spreads CyWebApi into per-app apis, which the mocked lifecycle never uses.
vi.mock('../../../app-api/core', () => ({ CyWebApi: {} }))

vi.mock('../../db', async (importOriginal) => ({
  ...((await importOriginal()) as typeof import('../../db')),
  getAppSettingFromDb: vi.fn().mockResolvedValue(undefined),
  getAllServiceAppsFromDb: vi.fn().mockResolvedValue([]),
  getAppFromDb: vi.fn().mockResolvedValue(undefined),
  deleteAppFromDb: vi.fn().mockResolvedValue(undefined),
  putWorkspaceToDb: vi.fn().mockResolvedValue(undefined),
}))

// Hoisted rather than imported: src/data may not import from src/features
// (src/data/layering.test.ts), and the core-app tests need the handle.
const { mockObtainCatalogEntries } = vi.hoisted(() => ({
  mockObtainCatalogEntries: vi.fn(),
}))
vi.mock('../../../features/AppManager/manifest/obtainCatalogEntries', () => ({
  obtainCatalogEntries: mockObtainCatalogEntries.mockResolvedValue([]),
}))

vi.mock('../../../features/AppManager/install/migrateLegacyApps', () => ({
  migrateLegacyApps: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../features/AppManager/install/installGate', () => {
  const isHostCompatible = vi.fn((_range?: string) => true)
  return {
    isAllowedOrigin: vi.fn(() => true),
    isCatalogEntryAllowed: vi.fn(() => true),
    isHostCompatible,
    // As in the real module: the entry's range through isHostCompatible, so
    // a test that stubs isHostCompatible decides compatibility everywhere.
    runsOnThisHost: (entry: { compatibleHostVersions?: string }) =>
      isHostCompatible(entry.compatibleHostVersions),
    incompatibleHostFailure: (entry: { compatibleHostVersions?: string }) => ({
      code: 'incompatible-host',
      range: entry.compatibleHostVersions ?? '',
      hostVersion: '1.1.1',
    }),
    hostVersion: vi.fn(() => '1.1.1'),
  }
})

vi.mock('./appLifecycle', () => ({
  mountApp: vi.fn().mockResolvedValue(undefined),
  unmountApp: vi.fn().mockResolvedValue(undefined),
  unmountAllApps: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../features/AppManager/loader/loadRemoteApp', () => ({
  loadRemoteApp: vi.fn(),
}))

const mockIsAllowedOrigin = isAllowedOrigin as Mock
const mockIsCatalogEntryAllowed = isCatalogEntryAllowed as Mock
const mockIsHostCompatible = isHostCompatible as Mock
const mockMigrate = migrateLegacyApps as Mock
const mockLoadRemoteApp = loadRemoteApp as Mock
const mockMountApp = mountApp as Mock
const mockUnmountApp = unmountApp as Mock
const mockGetAppSettingFromDb = getAppSettingFromDb as Mock

const entry = (id: string, version = '1.0.0'): AppCatalogEntry => ({
  id,
  url: `https://apps.cytoscape.org/web/${id}/${version}/remoteEntry.js`,
  author: 'Test',
  name: `${id} app`,
  version,
})

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(
    AppConfigContext.Provider,
    { value: defaultAppConfig },
    children,
  )

const installed = () =>
  useWorkspaceStore.getState().workspace.installedApps ?? []

/** Render the hook and wait for its init effect to settle. */
const renderManager = async () => {
  const rendered = renderHook(() => useAppManager(), { wrapper })
  await waitFor(() => expect(mockMigrate).toHaveBeenCalled())
  return rendered
}

describe('useAppManager — install / uninstall', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAllowedOrigin.mockReturnValue(true)
    mockIsCatalogEntryAllowed.mockReturnValue(true)
    mockIsHostCompatible.mockReturnValue(true)
    appRegistry.clear()
    useAppStore.setState({ loadedEntries: {} })
    // Hydrated workspace so addInstalledApp persists and the readiness gate
    // resolves immediately.
    useWorkspaceStore.getState().set({
      id: 'ws-test',
      name: 'Test',
      isRemote: false,
      networkIds: [],
      networkModified: {},
      creationTime: new Date(),
      localModificationTime: new Date(),
      currentNetworkId: '',
      installedApps: [],
    })
    useAppStore.getState().setCatalog([])
    useMessageStore.getState().resetMessages()
  })

  describe('installApp', () => {
    it('persists an allowed entry and merges it into the catalog', async () => {
      const { result } = await renderManager()

      await act(async () => {
        await result.current.installApp(entry('hello'), { activate: false })
      })

      expect(installed().map((a) => a.entry.id)).toEqual(['hello'])
      expect(installed()[0].source).toBe('appstore')
      expect(installed()[0].status).toBe(AppStatus.Inactive)
      expect(useAppStore.getState().catalog['hello']).toBeDefined()
      expect(useAppStore.getState().catalogSources['hello']).toBe('appstore')
    })

    // isAllowedOrigin is mocked here, so what this asserts is the wiring: the
    // hook must hand the gate this deployment's opt-in, or the gate decides
    // with the field permanently undefined and dev1 never works.
    it('passes the localhost opt-in through to the origin gate', async () => {
      const optedIn = {
        ...defaultAppConfig,
        allowsLocalhostAppsOn: 'https://dev1.ndexbio.org',
      }
      const optedInWrapper = ({ children }: { children: ReactNode }) =>
        createElement(AppConfigContext.Provider, { value: optedIn }, children)

      const { result } = renderHook(() => useAppManager(), {
        wrapper: optedInWrapper,
      })
      await waitFor(() => expect(mockMigrate).toHaveBeenCalled())

      await act(async () => {
        await result.current.installApp(entry('hello'), { activate: false })
      })

      expect(mockIsAllowedOrigin).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        'https://dev1.ndexbio.org',
      )
    })

    it('rejects a disallowed origin and persists nothing', async () => {
      mockIsAllowedOrigin.mockReturnValue(false)
      const { result } = await renderManager()

      await act(async () => {
        await result.current.installApp(entry('evil'), { activate: false })
      })

      expect(installed()).toHaveLength(0)
      expect(useAppStore.getState().catalog['evil']).toBeUndefined()
      const messages = useMessageStore.getState().messages
      expect(messages[messages.length - 1].severity).toBe('error')
    })

    it('installs inactive with a warning when the host version is incompatible', async () => {
      mockIsHostCompatible.mockReturnValue(false)
      const { result } = await renderManager()

      await act(async () => {
        await result.current.installApp(entry('future'), { activate: true })
      })

      expect(installed().map((a) => a.entry.id)).toEqual(['future'])
      expect(installed()[0].status).toBe(AppStatus.Inactive)
      const messages = useMessageStore.getState().messages
      expect(messages[messages.length - 1].severity).toBe('warning')
    })

    it('is idempotent — installing the same entry twice does not duplicate', async () => {
      const { result } = await renderManager()

      await act(async () => {
        await result.current.installApp(entry('hello'), { activate: false })
        await result.current.installApp(entry('hello'), { activate: false })
      })

      expect(installed().filter((a) => a.entry.id === 'hello')).toHaveLength(1)
    })
  })

  // #810: an App Store link to a newer version updated the installed record
  // but left the old module running until a reload. The module in memory was
  // loaded from the old version's URL, and the fast re-enable path reused it.
  describe('installApp — version update', () => {
    beforeEach(() => {
      useAppStore.setState({ loadStates: {}, loadErrors: {}, apps: {} })
      mockLoadRemoteApp.mockImplementation(
        async (id: string, url: string, registry: Map<string, unknown>) => {
          const app = { id, name: id, status: AppStatus.Inactive, url }
          registry.set(id, app)
          return { ok: true, app }
        },
      )
      // The real helpers keep the mounted-id set; the update path relies on it.
      mockMountApp.mockImplementation(
        async (app: { id: string }, _ctx: unknown, mounted: Set<string>) => {
          mounted.add(app.id)
        },
      )
      mockUnmountApp.mockImplementation(
        async (app: { id: string }, mounted: Set<string>) => {
          mounted.delete(app.id)
        },
      )
    })

    afterEach(() => {
      mockMountApp.mockReset().mockResolvedValue(undefined)
      mockUnmountApp.mockReset().mockResolvedValue(undefined)
    })

    it('unmounts the running version and loads the new one', async () => {
      const { result } = await renderManager()
      await act(async () => {
        await result.current.installApp(entry('mcode', '1.0.0'), {
          activate: true,
        })
      })
      const oldApp = appRegistry.get('mcode')

      await act(async () => {
        await result.current.installApp(entry('mcode', '1.1.0'), {
          activate: true,
        })
      })

      expect(mockLoadRemoteApp).toHaveBeenLastCalledWith(
        'mcode',
        entry('mcode', '1.1.0').url,
        appRegistry,
      )
      expect(mockUnmountApp).toHaveBeenCalledWith(oldApp, expect.any(Set))
      expect(mockMountApp).toHaveBeenLastCalledWith(
        expect.objectContaining({ url: entry('mcode', '1.1.0').url }),
        expect.anything(),
        expect.any(Set),
      )
      expect(useAppStore.getState().loadStates['mcode']).toBe('loaded')
      expect(installed()[0].entry.version).toBe('1.1.0')
    })

    // The path in the issue: the page boots with 1.0.0 active, and the App
    // Store link that opened it installs 1.1.0.
    it('replaces a version the startup auto-load mounted', async () => {
      useWorkspaceStore.getState().addInstalledApp({
        entry: entry('mcode', '1.0.0'),
        status: AppStatus.Active,
        source: 'appstore',
        installedAt: '2026-01-01T00:00:00.000Z',
      })
      const { result } = await renderManager()
      await waitFor(() =>
        expect(useAppStore.getState().loadStates['mcode']).toBe('loaded'),
      )
      const oldApp = appRegistry.get('mcode')

      await act(async () => {
        await result.current.installApp(entry('mcode', '1.1.0'), {
          activate: true,
        })
      })

      expect(mockUnmountApp).toHaveBeenCalledWith(oldApp, expect.any(Set))
      expect(appRegistry.get('mcode')).toEqual(
        expect.objectContaining({ url: entry('mcode', '1.1.0').url }),
      )
    })

    it('updates an app that was loaded and then disabled', async () => {
      const { result } = await renderManager()
      await act(async () => {
        await result.current.installApp(entry('mcode', '1.0.0'), {
          activate: true,
        })
        await result.current.deactivateApp('mcode')
      })

      await act(async () => {
        await result.current.installApp(entry('mcode', '1.1.0'), {
          activate: true,
        })
      })

      expect(mockLoadRemoteApp).toHaveBeenLastCalledWith(
        'mcode',
        entry('mcode', '1.1.0').url,
        appRegistry,
      )
      expect(appRegistry.get('mcode')).toEqual(
        expect.objectContaining({ url: entry('mcode', '1.1.0').url }),
      )
    })

    it('reuses the module in memory when the URL has not changed', async () => {
      const { result } = await renderManager()
      await act(async () => {
        await result.current.installApp(entry('mcode', '1.0.0'), {
          activate: true,
        })
        await result.current.deactivateApp('mcode')
        await result.current.installApp(entry('mcode', '1.0.0'), {
          activate: true,
        })
      })

      expect(mockLoadRemoteApp).toHaveBeenCalledTimes(1)
      expect(mockMountApp).toHaveBeenCalledTimes(2)
    })
  })

  describe('uninstallApp', () => {
    it('removes an installed app from the workspace and catalog', async () => {
      const { result } = await renderManager()

      await act(async () => {
        await result.current.installApp(entry('hello'), { activate: false })
      })
      expect(installed()).toHaveLength(1)

      await act(async () => {
        await result.current.uninstallApp('hello')
      })

      expect(installed()).toHaveLength(0)
      expect(useAppStore.getState().catalog['hello']).toBeUndefined()
    })

    // #699: uninstalling a manifest app cannot stick — recomposeCatalog
    // re-adds it from the manifest — so the command refuses instead of
    // silently discarding the pinned record.
    it('refuses to uninstall an app the manifest still ships', async () => {
      const { result } = await renderManager()

      await act(async () => {
        await result.current.installApp(entry('hello'), { activate: false })
      })
      act(() => {
        useAppStore
          .getState()
          .setCatalog([entry('hello')], { hello: 'appstore' }, ['hello'])
      })

      await act(async () => {
        await result.current.uninstallApp('hello')
      })

      expect(installed()).toHaveLength(1)
      expect(useAppStore.getState().catalog['hello']).toBeDefined()
    })
  })

  describe('status reconciliation', () => {
    it('creates a source:manifest record when a manifest app is activated', async () => {
      // A manifest app present in the catalog but not yet in installedApps
      mockLoadRemoteApp.mockImplementation(
        async (id: string, _url: string, registry: Map<string, unknown>) => {
          const app = { id, name: id, status: AppStatus.Inactive }
          registry.set(id, app)
          return { ok: true, app }
        },
      )
      const { result } = await renderManager()
      act(() => {
        useAppStore
          .getState()
          .setCatalog([entry('manifestApp')], { manifestApp: 'manifest' })
      })

      await act(async () => {
        await result.current.activateApp('manifestApp')
      })

      const record = installed().find((a) => a.entry.id === 'manifestApp')
      expect(record).toBeDefined()
      expect(record?.source).toBe('manifest')
      expect(record?.status).toBe(AppStatus.Active)
    })

    it('round-trips status through deactivate', async () => {
      mockLoadRemoteApp.mockImplementation(
        async (id: string, _url: string, registry: Map<string, unknown>) => {
          const app = { id, name: id, status: AppStatus.Inactive }
          registry.set(id, app)
          return { ok: true, app }
        },
      )
      const { result } = await renderManager()

      await act(async () => {
        await result.current.installApp(entry('hello'), { activate: true })
      })
      expect(installed()[0].status).toBe(AppStatus.Active)

      await act(async () => {
        await result.current.deactivateApp('hello')
      })
      expect(installed()[0].status).toBe(AppStatus.Inactive)
    })
  })
  // G-6: the catalog was the one install path with no origin check, so a
  // user-set Manifest Source could name any URL and it would be loaded.
  describe('activateApp — catalog trust boundary', () => {
    const seedCatalog = (
      source: 'manifest' | 'appstore' = 'manifest',
    ): void => {
      act(() => {
        useAppStore.getState().setCatalog([entry('remote')], { remote: source })
      })
    }

    it('refuses to load an entry the catalog gate rejects, and says so', async () => {
      mockIsCatalogEntryAllowed.mockReturnValue(false)
      const { result } = await renderManager()
      seedCatalog()

      await act(async () => {
        await result.current.activateApp('remote')
      })

      expect(mockLoadRemoteApp).not.toHaveBeenCalled()
      expect(useAppStore.getState().loadStates['remote']).toBe('failed')
      const messages = useMessageStore.getState().messages
      expect(messages[messages.length - 1].message).toContain(
        'not from an allowed origin',
      )
    })

    it('loads it when the gate allows it', async () => {
      const { result } = await renderManager()
      seedCatalog()

      await act(async () => {
        await result.current.activateApp('remote')
      })

      expect(mockLoadRemoteApp).toHaveBeenCalled()
    })

    // The exemption is "the default manifest lists this entry", so the hook has
    // to answer that question truthfully. Hardcoding true would restore the
    // bypass while leaving the call in place.
    it('does not vouch for an entry the loaded manifest does not list', async () => {
      const { result } = await renderManager()
      // Seeded straight into the catalog, so no manifest was loaded that
      // contains it — the shape a workspace-restored or previously-activated
      // app has after the Manifest Source is reset to default.
      seedCatalog('manifest')

      await act(async () => {
        await result.current.activateApp('remote')
      })

      expect(mockIsCatalogEntryAllowed).toHaveBeenCalledWith(
        expect.any(String),
        false,
        expect.any(Array),
        undefined,
      )
    })

    // Stored provenance is not the signal. An app first activated from a custom
    // Manifest Source persists as source:'manifest' (reconcileInstalledStatus
    // stamps that whichever manifest it came from), and composeCatalog hands an
    // installed-only entry its stored source back. Once the source is reset to
    // default, a provenance test would have trusted it.
    it('does not vouch for a stored source:manifest entry either', async () => {
      const { result } = await renderManager()
      seedCatalog('manifest')
      expect(useAppStore.getState().manifestSource).toBeUndefined()

      await act(async () => {
        await result.current.activateApp('remote')
      })

      const [, fromDefaultManifest] = mockIsCatalogEntryAllowed.mock.calls[0]
      expect(fromDefaultManifest).toBe(false)
    })
  })
})

// #719: the reason a load failed reached only the debug log. It must reach the
// store (for the row) and a toast (for the paths where the list is closed).
describe('useAppManager — load failure reasons', () => {
  const idMismatch = {
    ok: false,
    failure: {
      code: 'id-mismatch',
      url: 'https://apps.cytoscape.org/web/chrisapp/1.0.0/remoteEntry.js',
      expected: 'chrisapp',
      received: 'chrisApp',
    },
  } as const

  /** Seed a hydrated workspace with the given installed-app records. */
  const seedWorkspace = (
    records: Array<{ id: string; status: AppStatus }>,
  ): void => {
    useWorkspaceStore.getState().set({
      id: 'ws-test',
      name: 'Test',
      isRemote: false,
      networkIds: [],
      networkModified: {},
      creationTime: new Date(),
      localModificationTime: new Date(),
      currentNetworkId: '',
      installedApps: records.map((r) => ({
        entry: entry(r.id),
        status: r.status,
        source: 'appstore' as const,
        installedAt: '2026-01-01T00:00:00.000Z',
      })),
    })
  }

  const lastMessage = (): string => {
    const messages = useMessageStore.getState().messages
    return messages[messages.length - 1]?.message ?? ''
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAllowedOrigin.mockReturnValue(true)
    mockIsCatalogEntryAllowed.mockReturnValue(true)
    mockIsHostCompatible.mockReturnValue(true)
    appRegistry.clear()
    useAppStore.setState({ loadedEntries: {} })
    seedWorkspace([])
    useAppStore.setState({ loadStates: {}, loadErrors: {}, apps: {} })
    useAppStore.getState().setCatalog([])
    useMessageStore.getState().resetMessages()
  })

  it('stores the cause and toasts it when activation fails', async () => {
    mockLoadRemoteApp.mockResolvedValue(idMismatch)
    const { result } = await renderManager()
    act(() => {
      useAppStore.getState().setCatalog([entry('chrisapp')])
    })

    await act(async () => {
      await result.current.activateApp('chrisapp')
    })

    expect(useAppStore.getState().loadStates['chrisapp']).toBe('failed')
    expect(useAppStore.getState().loadErrors['chrisapp']).toEqual(
      idMismatch.failure,
    )
    expect(lastMessage()).toContain('mis-packaged')
    expect(lastMessage()).toContain('chrisApp')
  })

  it('records origin-blocked without adding a second toast', async () => {
    mockIsCatalogEntryAllowed.mockReturnValue(false)
    const { result } = await renderManager()
    act(() => {
      useAppStore.getState().setCatalog([entry('remote')])
    })

    await act(async () => {
      await result.current.activateApp('remote')
    })

    expect(useAppStore.getState().loadErrors['remote']?.code).toBe(
      'origin-blocked',
    )
    // The pre-existing gate message, not the generic failure toast.
    expect(useMessageStore.getState().messages).toHaveLength(1)
    expect(lastMessage()).toContain('not from an allowed origin')
  })

  it('records mount-failed and offers the reason when mount throws', async () => {
    mockLoadRemoteApp.mockImplementation(
      async (id: string, _url: string, registry: Map<string, unknown>) => {
        const app = { id, name: id, status: AppStatus.Inactive }
        registry.set(id, app)
        return { ok: true, app }
      },
    )
    ;(mountApp as Mock).mockRejectedValueOnce(new Error('boom'))
    const { result } = await renderManager()
    act(() => {
      useAppStore.getState().setCatalog([entry('breaks')])
    })

    await act(async () => {
      await result.current.activateApp('breaks')
    })

    expect(useAppStore.getState().loadErrors['breaks']).toEqual({
      code: 'mount-failed',
      message: 'boom',
    })
    expect(lastMessage()).toContain('boom')
  })

  // Before this change the startup path wrapped the failure in a synthetic
  // Error and raised no toast at all, so a mis-packaged active app failed
  // silently on every page load.
  it('names the cause when one app fails at startup', async () => {
    mockLoadRemoteApp.mockResolvedValue(idMismatch)
    seedWorkspace([{ id: 'chrisapp', status: AppStatus.Active }])

    await renderManager()

    await waitFor(() => {
      expect(useAppStore.getState().loadErrors['chrisapp']).toEqual(
        idMismatch.failure,
      )
    })
    await waitFor(() => expect(lastMessage()).toContain('mis-packaged'))
  })

  // SnackbarMessageList shows one message at a time, so N broken apps must not
  // queue N toasts.
  it('collapses several startup failures into one toast', async () => {
    mockLoadRemoteApp.mockResolvedValue(idMismatch)
    seedWorkspace([
      { id: 'one', status: AppStatus.Active },
      { id: 'two', status: AppStatus.Active },
    ])

    await renderManager()

    await waitFor(() => {
      expect(useAppStore.getState().loadErrors['two']).toBeDefined()
    })
    await waitFor(() =>
      expect(lastMessage()).toBe(
        '2 apps failed to load — open App Manager for details.',
      ),
    )
    expect(useMessageStore.getState().messages).toHaveLength(1)
  })
})

// Core apps: every entry in the deployment's own apps.json is on unless the
// current workspace records that the user turned it off. Only that choice is
// written down; a workspace with no record of a core app gets it on.
describe('useAppManager — core apps', () => {
  const core = entry('coreApp')

  /** A loadRemoteApp that registers the module, as a successful load does. */
  const loadsFine = async (
    id: string,
    _url: string,
    registry: Map<string, unknown>,
  ) => {
    const app = { id, name: id, status: AppStatus.Inactive }
    registry.set(id, app)
    return { ok: true, app }
  }

  const record = (status: AppStatus): InstalledApp => ({
    entry: core,
    status,
    source: 'manifest',
    installedAt: '2026-01-01T00:00:00.000Z',
  })

  const seedWorkspace = (records: InstalledApp[]): void => {
    useWorkspaceStore.getState().set({
      id: 'ws-test',
      name: 'Test',
      isRemote: false,
      networkIds: [],
      networkModified: {},
      creationTime: new Date(),
      localModificationTime: new Date(),
      currentNetworkId: '',
      installedApps: records,
    })
  }

  /** Forget the session, as a page reload does; the workspace stays. */
  const resetSession = (): void => {
    appRegistry.clear()
    useAppStore.setState({ loadedEntries: {} })
    useAppStore.setState({
      apps: {},
      loadStates: {},
      loadErrors: {},
      manifestSource: undefined,
    })
    useAppStore.getState().setCatalog([])
  }

  const coreStatus = () => useAppStore.getState().apps['coreApp']?.status

  const lastMessage = (): string => {
    const messages = useMessageStore.getState().messages
    return messages[messages.length - 1]?.message ?? ''
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAllowedOrigin.mockReturnValue(true)
    mockIsCatalogEntryAllowed.mockReturnValue(true)
    mockIsHostCompatible.mockReturnValue(true)
    // The deployment's default apps.json lists one app.
    mockObtainCatalogEntries.mockResolvedValue([core])
    mockGetAppSettingFromDb.mockResolvedValue(undefined)
    seedWorkspace([])
    resetSession()
    useMessageStore.getState().resetMessages()
  })

  afterEach(() => {
    mockObtainCatalogEntries.mockResolvedValue([])
    mockGetAppSettingFromDb.mockResolvedValue(undefined)
  })

  it('turns a core app on at startup without writing a record', async () => {
    mockLoadRemoteApp.mockImplementation(loadsFine)

    await renderManager()

    await waitFor(() =>
      expect(useAppStore.getState().loadStates['coreApp']).toBe('loaded'),
    )
    expect(coreStatus()).toBe(AppStatus.Active)
    expect(mockMountApp).toHaveBeenCalledTimes(1)
    // "No record" is what on-by-default means. Writing one here would keep
    // the app running for this user after it is dropped from apps.json.
    expect(installed()).toEqual([])
  })

  it('keeps a core app off when the workspace records it was turned off', async () => {
    seedWorkspace([record(AppStatus.Inactive)])

    await renderManager()

    await waitFor(() => expect(coreStatus()).toBe(AppStatus.Inactive))
    expect(mockLoadRemoteApp).not.toHaveBeenCalled()
  })

  it('tries a core app again when its record says an earlier load failed', async () => {
    mockLoadRemoteApp.mockImplementation(loadsFine)
    seedWorkspace([record(AppStatus.Error)])

    await renderManager()

    await waitFor(() =>
      expect(useAppStore.getState().loadStates['coreApp']).toBe('loaded'),
    )
    expect(coreStatus()).toBe(AppStatus.Active)
  })

  it('records the user turning a core app off, so it stays off after a reload', async () => {
    mockLoadRemoteApp.mockImplementation(loadsFine)
    const first = await renderManager()
    await waitFor(() =>
      expect(useAppStore.getState().loadStates['coreApp']).toBe('loaded'),
    )

    await act(async () => {
      await first.result.current.deactivateApp('coreApp')
    })

    // Before core apps, turning off an app with no record saved nothing,
    // which would have brought this one back on at the next startup.
    expect(installed()).toEqual([
      expect.objectContaining({
        entry: expect.objectContaining({ id: 'coreApp' }),
        status: AppStatus.Inactive,
        source: 'manifest',
      }),
    ])

    first.unmount()
    resetSession()
    mockLoadRemoteApp.mockClear()
    mockMigrate.mockClear()

    await renderManager()

    await waitFor(() => expect(coreStatus()).toBe(AppStatus.Inactive))
    expect(mockLoadRemoteApp).not.toHaveBeenCalled()
  })

  it('tells the user when a core app fails to start, and keeps no record', async () => {
    mockLoadRemoteApp.mockResolvedValue({
      ok: false,
      failure: { code: 'fetch-failed', url: core.url, message: 'HTTP 404' },
    })

    await renderManager()

    await waitFor(() =>
      expect(lastMessage()).toContain('Could not load "coreApp app"'),
    )
    expect(lastMessage()).toContain('HTTP 404')
    expect(coreStatus()).toBe(AppStatus.Error)
    // A failure is not the user turning the app off: the next startup tries
    // again.
    expect(installed()).toEqual([])
  })

  // Review of the core-apps change: startup checked the origin but never
  // compatibleHostVersions, so a fresh workspace ran a core app declaring
  // >=999.0.0.
  it('does not start a core app this host cannot run, and says why on its row', async () => {
    mockObtainCatalogEntries.mockResolvedValue([
      { ...core, compatibleHostVersions: '>=999.0.0' },
    ])
    mockIsHostCompatible.mockImplementation(
      (range?: string) => range !== '>=999.0.0',
    )

    await renderManager()

    await waitFor(() =>
      expect(useAppStore.getState().loadErrors['coreApp']).toEqual({
        code: 'incompatible-host',
        range: '>=999.0.0',
        hostVersion: '1.1.1',
      }),
    )
    expect(mockLoadRemoteApp).not.toHaveBeenCalled()
    expect(coreStatus()).toBe(AppStatus.Inactive)
    // Not the user's error to fix, and it would recur at every start.
    expect(useMessageStore.getState().messages).toHaveLength(0)
    expect(installed()).toEqual([])
  })

  it('refuses to turn on an app this host cannot run', async () => {
    mockObtainCatalogEntries.mockResolvedValue([])
    const { result } = await renderManager()
    act(() => {
      useAppStore
        .getState()
        .setCatalog([{ ...core, compatibleHostVersions: '>=999.0.0' }])
    })
    mockIsHostCompatible.mockImplementation(
      (range?: string) => range !== '>=999.0.0',
    )

    await act(async () => {
      await result.current.activateApp('coreApp')
    })

    expect(mockLoadRemoteApp).not.toHaveBeenCalled()
    expect(useAppStore.getState().loadErrors['coreApp']?.code).toBe(
      'incompatible-host',
    )
    expect(lastMessage()).toContain('needs Cytoscape Web >=999.0.0')
  })

  it('clears the failure of a failed core app the user turns off, and keeps it off', async () => {
    mockLoadRemoteApp.mockResolvedValue({
      ok: false,
      failure: { code: 'fetch-failed', url: core.url, message: 'HTTP 404' },
    })
    const { result } = await renderManager()
    await waitFor(() =>
      expect(useAppStore.getState().loadStates['coreApp']).toBe('failed'),
    )

    await act(async () => {
      await result.current.deactivateApp('coreApp')
    })

    expect(useAppStore.getState().loadStates['coreApp']).not.toBe('failed')
    expect(useAppStore.getState().loadErrors['coreApp']).toBeUndefined()
    expect(installed()).toEqual([
      expect.objectContaining({ status: AppStatus.Inactive }),
    ])
  })

  // A core app broke, the user did nothing, and the fix shipped as a new
  // version in apps.json. The next start must load the fixed version.
  describe('a fixed version after a broken one', () => {
    const fixed = entry('coreApp', '1.0.1')

    const restartWith = async (
      first: Awaited<ReturnType<typeof renderManager>>,
      catalog: AppCatalogEntry[],
    ) => {
      first.unmount()
      resetSession()
      mockLoadRemoteApp.mockReset()
      mockLoadRemoteApp.mockImplementation(loadsFine)
      mockMigrate.mockClear()
      mockObtainCatalogEntries.mockResolvedValue(catalog)
      await renderManager()
      await waitFor(() =>
        expect(useAppStore.getState().loadStates['coreApp']).toBe('loaded'),
      )
    }

    it('loads it when the broken one failed at startup', async () => {
      mockLoadRemoteApp.mockResolvedValue({
        ok: false,
        failure: { code: 'fetch-failed', url: core.url, message: 'HTTP 404' },
      })
      const first = await renderManager()
      await waitFor(() => expect(lastMessage()).toContain('Could not load'))

      await restartWith(first, [fixed])

      expect(mockLoadRemoteApp).toHaveBeenCalledWith(
        'coreApp',
        fixed.url,
        expect.any(Map),
      )
      expect(coreStatus()).toBe(AppStatus.Active)
      expect(installed()).toEqual([])
    })

    it('loads it after a Retry of the broken one failed too', async () => {
      mockLoadRemoteApp.mockImplementation(loadsFine)
      ;(mountApp as Mock)
        .mockRejectedValueOnce(new Error('boom'))
        .mockRejectedValueOnce(new Error('boom again'))
      const first = await renderManager()
      await waitFor(() =>
        expect(useAppStore.getState().loadStates['coreApp']).toBe('failed'),
      )
      await act(async () => {
        await first.result.current.retryApp('coreApp')
      })
      expect(useAppStore.getState().loadStates['coreApp']).toBe('failed')

      await restartWith(first, [fixed])

      expect(coreStatus()).toBe(AppStatus.Active)
      expect(installed()).toEqual([])
    })

    it('loads it over an App Store install of the broken version', async () => {
      seedWorkspace([
        {
          entry: core,
          status: AppStatus.Active,
          source: 'appstore',
          installedAt: '2026-01-01T00:00:00.000Z',
        },
      ])
      mockLoadRemoteApp.mockResolvedValue({
        ok: false,
        failure: { code: 'fetch-failed', url: core.url, message: 'HTTP 404' },
      })
      const first = await renderManager()
      await waitFor(() =>
        expect(useAppStore.getState().loadStates['coreApp']).toBe('failed'),
      )

      await restartWith(first, [fixed])

      expect(mockLoadRemoteApp).toHaveBeenCalledWith(
        'coreApp',
        fixed.url,
        expect.any(Map),
      )
      expect(coreStatus()).toBe(AppStatus.Active)
    })
  })

  it('leaves an app from a user-set catalog off until the user turns it on', async () => {
    // A custom Manifest Source is the user's list, not the deployment's: its
    // apps are not core apps and never run without a click.
    mockGetAppSettingFromDb.mockResolvedValue({
      type: 'url',
      url: 'https://example.org/catalog.json',
    })

    await renderManager()

    await waitFor(() =>
      expect(useAppStore.getState().catalog['coreApp']).toBeDefined(),
    )
    await act(async () => {})
    expect(mockLoadRemoteApp).not.toHaveBeenCalled()
    expect(coreStatus()).toBeUndefined()
  })
})

// An install link offers a version of an app the catalog may already carry,
// often a core app from apps.json. The newer version wins (semver); an older
// offer keeps what is there and only turns it on.
describe('useAppManager — install link versions', () => {
  const ID = 'coreApp'
  const at = (version: string): AppCatalogEntry => entry(ID, version)

  /** A loadRemoteApp that registers a module remembering its URL. */
  const loadsFine = async (
    id: string,
    url: string,
    registry: Map<string, unknown>,
  ) => {
    const app = { id, name: id, status: AppStatus.Inactive, url }
    registry.set(id, app)
    return { ok: true, app }
  }

  const seedWorkspace = (records: InstalledApp[]): void => {
    useWorkspaceStore.getState().set({
      id: 'ws-test',
      name: 'Test',
      isRemote: false,
      networkIds: [],
      networkModified: {},
      creationTime: new Date(),
      localModificationTime: new Date(),
      currentNetworkId: '',
      installedApps: records,
    })
  }

  const catalogVersion = () => useAppStore.getState().catalog[ID]?.version
  const loadedFrom = () =>
    (appRegistry.get(ID) as unknown as { url?: string } | undefined)?.url

  const install = async (
    rendered: Awaited<ReturnType<typeof renderManager>>,
    offered: AppCatalogEntry,
  ) => {
    let outcome: unknown
    await act(async () => {
      outcome = await rendered.result.current.installApp(offered, {
        activate: true,
      })
    })
    return outcome
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAllowedOrigin.mockReturnValue(true)
    mockIsCatalogEntryAllowed.mockReturnValue(true)
    mockIsHostCompatible.mockReturnValue(true)
    mockGetAppSettingFromDb.mockResolvedValue(undefined)
    mockLoadRemoteApp.mockImplementation(loadsFine)
    // The real lifecycle keeps the mounted-id set; the version swap uses it.
    mockMountApp.mockImplementation(
      async (app: { id: string }, _ctx: unknown, mounted: Set<string>) => {
        mounted.add(app.id)
      },
    )
    mockUnmountApp.mockImplementation(
      async (app: { id: string }, mounted: Set<string>) => {
        mounted.delete(app.id)
      },
    )
    appRegistry.clear()
    useAppStore.setState({ loadedEntries: {} })
    seedWorkspace([])
    useAppStore.setState({
      apps: {},
      loadStates: {},
      loadErrors: {},
      manifestSource: undefined,
    })
    useAppStore.getState().setCatalog([])
    useMessageStore.getState().resetMessages()
  })

  afterEach(() => {
    mockObtainCatalogEntries.mockResolvedValue([])
  })

  it('replaces the running version with a newer one', async () => {
    mockObtainCatalogEntries.mockResolvedValue([at('3.1.23')])
    const rendered = await renderManager()
    await waitFor(() => expect(loadedFrom()).toBe(at('3.1.23').url))

    const outcome = await install(rendered, at('3.2.0'))

    expect(outcome).toEqual({ kind: 'update', from: '3.1.23', to: '3.2.0' })
    expect(catalogVersion()).toBe('3.2.0')
    expect(loadedFrom()).toBe(at('3.2.0').url)
    expect(useAppStore.getState().loadedEntries[ID]?.url).toBe(at('3.2.0').url)
    expect(mockUnmountApp).toHaveBeenCalledWith(
      expect.objectContaining({ url: at('3.1.23').url }),
      expect.any(Set),
    )
    expect(useAppStore.getState().apps[ID]?.status).toBe(AppStatus.Active)
    expect(installed()).toEqual([
      expect.objectContaining({
        entry: expect.objectContaining({ version: '3.2.0' }),
        source: 'appstore',
        status: AppStatus.Active,
      }),
    ])
  })

  it('keeps a newer version when offered an older one, and turns it on', async () => {
    mockObtainCatalogEntries.mockResolvedValue([at('3.1.2')])
    // The user had turned the core app off.
    seedWorkspace([
      {
        entry: at('3.1.2'),
        status: AppStatus.Inactive,
        source: 'manifest',
        installedAt: '2026-01-01T00:00:00.000Z',
      },
    ])
    const rendered = await renderManager()
    await waitFor(() =>
      expect(useAppStore.getState().apps[ID]?.status).toBe(AppStatus.Inactive),
    )

    const outcome = await install(rendered, at('3.1.1'))

    expect(outcome).toEqual({
      kind: 'older',
      installed: '3.1.2',
      offered: '3.1.1',
    })
    expect(catalogVersion()).toBe('3.1.2')
    expect(loadedFrom()).toBe(at('3.1.2').url)
    expect(useAppStore.getState().apps[ID]?.status).toBe(AppStatus.Active)
    // The record keeps the newer entry; only its status changed.
    expect(installed()).toEqual([
      expect.objectContaining({
        entry: expect.objectContaining({ version: '3.1.2' }),
        source: 'manifest',
        status: AppStatus.Active,
      }),
    ])
  })

  it('keeps a running app running when Install from URL updates it', async () => {
    // Install from URL passes activate: false. Writing the new record as
    // inactive would turn the app off at the next start.
    mockObtainCatalogEntries.mockResolvedValue([at('1.0.0')])
    const rendered = await renderManager()
    await waitFor(() => expect(loadedFrom()).toBe(at('1.0.0').url))

    let outcome: unknown
    await act(async () => {
      outcome = await rendered.result.current.installApp(at('1.1.0'), {
        activate: false,
      })
    })

    expect(outcome).toEqual({ kind: 'update', from: '1.0.0', to: '1.1.0' })
    expect(loadedFrom()).toBe(at('1.1.0').url)
    expect(installed()[0]?.status).toBe(AppStatus.Active)
  })

  // Review of the version change: an incompatible upgrade set activate=false
  // but still replaced the catalog entry and the record, leaving v1 running
  // under v2's entry. The working version is kept instead.
  it('keeps the running version when the offered one cannot run here', async () => {
    mockObtainCatalogEntries.mockResolvedValue([at('1.0.0')])
    const rendered = await renderManager()
    await waitFor(() => expect(loadedFrom()).toBe(at('1.0.0').url))
    mockIsHostCompatible.mockImplementation(
      (range?: string) => range !== '>=999.0.0',
    )

    const outcome = await install(rendered, {
      ...at('2.0.0'),
      compatibleHostVersions: '>=999.0.0',
    })

    expect(outcome).toEqual({
      kind: 'incompatible',
      offered: '2.0.0',
      range: '>=999.0.0',
      kept: '1.0.0',
    })
    expect(catalogVersion()).toBe('1.0.0')
    expect(loadedFrom()).toBe(at('1.0.0').url)
    expect(useAppStore.getState().apps[ID]?.status).toBe(AppStatus.Active)
    expect(installed()).toEqual([])
  })

  it('changes nothing when offered the version already running', async () => {
    mockObtainCatalogEntries.mockResolvedValue([at('1.0.0')])
    const rendered = await renderManager()
    await waitFor(() => expect(loadedFrom()).toBe(at('1.0.0').url))

    const outcome = await install(rendered, at('1.0.0'))

    expect(outcome).toEqual({ kind: 'same', version: '1.0.0' })
    expect(mockLoadRemoteApp).toHaveBeenCalledTimes(1)
    // No App Store record pinning what apps.json already ships.
    expect(installed()).toEqual([])
  })

  // Review: Refresh leaves a running version alone (runtime spec §7.5), so a
  // link to the version Refresh brought found it already installed and left
  // the old code running.
  it('runs the catalog version a link offers while an older one still runs', async () => {
    mockObtainCatalogEntries.mockResolvedValue([at('1.0.0')])
    const rendered = await renderManager()
    await waitFor(() => expect(loadedFrom()).toBe(at('1.0.0').url))
    mockObtainCatalogEntries.mockResolvedValue([at('2.0.0')])
    await act(async () => {
      await rendered.result.current.refreshCatalog()
    })
    expect(loadedFrom()).toBe(at('1.0.0').url)

    const outcome = await install(rendered, at('2.0.0'))

    expect(outcome).toEqual({ kind: 'same', version: '2.0.0' })
    expect(loadedFrom()).toBe(at('2.0.0').url)
    expect(useAppStore.getState().loadedEntries[ID]?.version).toBe('2.0.0')
    expect(useAppStore.getState().apps[ID]?.status).toBe(AppStatus.Active)
    // Turning it on records it as the manifest's, never as an App Store pin.
    expect(installed().map((record) => record.source)).toEqual(['manifest'])
  })

  // Review: a user-set catalog may list an app's id at an origin this
  // deployment does not allow, which the startup gate refuses to load. Ranking
  // by version alone let that entry displace a loadable App Store install.
  describe('a user-set catalog entry the origin check blocks', () => {
    const blocked = (version: string): AppCatalogEntry => ({
      ...at(version),
      url: `https://blocked.example/${ID}/${version}/remoteEntry.js`,
    })

    beforeEach(() => {
      mockGetAppSettingFromDb.mockImplementation(async (key: string) =>
        key === 'manifestSource'
          ? { type: 'url', url: 'https://catalog.example/apps.json' }
          : undefined,
      )
      // As the real gate: the default catalog is exempt, the rest must come
      // from an allowed origin.
      mockIsCatalogEntryAllowed.mockImplementation(
        (url: string, fromDefaultManifest: boolean) =>
          fromDefaultManifest || !url.startsWith('https://blocked.example/'),
      )
    })

    it('does not displace a loadable App Store install, even when newer', async () => {
      seedWorkspace([
        {
          entry: at('1.0.0'),
          status: AppStatus.Active,
          source: 'appstore',
          installedAt: '2026-11-11T00:00:00.000Z',
        },
      ])
      mockObtainCatalogEntries.mockResolvedValue([blocked('2.0.0')])

      await renderManager()

      await waitFor(() => expect(loadedFrom()).toBe(at('1.0.0').url))
      expect(catalogVersion()).toBe('1.0.0')
      expect(useAppStore.getState().loadErrors[ID]).toBeUndefined()
    })

    it('is replaced by a loadable version from a link, even an older one', async () => {
      mockObtainCatalogEntries.mockResolvedValue([blocked('2.0.0')])
      const rendered = await renderManager()

      const outcome = await install(rendered, at('1.0.0'))

      expect(outcome).toEqual({ kind: 'update', from: '2.0.0', to: '1.0.0' })
      expect(catalogVersion()).toBe('1.0.0')
      expect(loadedFrom()).toBe(at('1.0.0').url)
    })

    it('is what the install dialog previews, too', async () => {
      mockObtainCatalogEntries.mockResolvedValue([blocked('2.0.0')])
      const rendered = await renderManager()

      expect(rendered.result.current.installPreview(at('1.0.0'))).toEqual({
        kind: 'update',
        from: '2.0.0',
        to: '1.0.0',
      })
    })
  })

  it('previews a link from an origin the install refuses as rejected', async () => {
    mockObtainCatalogEntries.mockResolvedValue([at('1.0.0')])
    const rendered = await renderManager()
    mockIsAllowedOrigin.mockReturnValue(false)

    expect(rendered.result.current.installPreview(at('2.0.0'))).toEqual({
      kind: 'rejected',
    })
  })

  it('compares against the catalog even when called before it has loaded', async () => {
    let releaseCatalog: (entries: AppCatalogEntry[]) => void = () => {}
    mockObtainCatalogEntries.mockReturnValue(
      new Promise<AppCatalogEntry[]>((resolve) => {
        releaseCatalog = resolve
      }),
    )
    const rendered = renderHook(() => useAppManager(), { wrapper })

    let outcome: unknown
    await act(async () => {
      const pending = rendered.result.current.installApp(at('1.0.0'), {
        activate: true,
      })
      releaseCatalog([at('1.1.0')])
      outcome = await pending
    })

    expect(outcome).toEqual({
      kind: 'older',
      installed: '1.1.0',
      offered: '1.0.0',
    })
    expect(catalogVersion()).toBe('1.1.0')
  })

  it('waits for a startup load of the same app before updating it', async () => {
    mockObtainCatalogEntries.mockResolvedValue([at('1.0.0')])
    // Hold the startup load of 1.0.0 until the install is under way.
    let finishStartupLoad: () => void = () => {}
    mockLoadRemoteApp.mockImplementationOnce(
      (id: string, url: string, registry: Map<string, unknown>) =>
        new Promise((resolve) => {
          finishStartupLoad = () => resolve(loadsFine(id, url, registry))
        }),
    )
    const rendered = await renderManager()
    await waitFor(() => expect(mockLoadRemoteApp).toHaveBeenCalledTimes(1))

    let outcome: unknown
    await act(async () => {
      const pending = rendered.result.current.installApp(at('1.1.0'), {
        activate: true,
      })
      finishStartupLoad()
      outcome = await pending
    })

    expect(outcome).toEqual({ kind: 'update', from: '1.0.0', to: '1.1.0' })
    // The startup's 1.0.0 was mounted, then swapped for 1.1.0; the bookkeeping
    // names the version that is running.
    expect(loadedFrom()).toBe(at('1.1.0').url)
    expect(useAppStore.getState().loadedEntries[ID]?.url).toBe(at('1.1.0').url)
    expect(mockMountApp).toHaveBeenLastCalledWith(
      expect.objectContaining({ url: at('1.1.0').url }),
      expect.anything(),
      expect.any(Set),
    )
  })
})
