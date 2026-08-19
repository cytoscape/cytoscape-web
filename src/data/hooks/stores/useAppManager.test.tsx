import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement, ReactNode } from 'react'

import { AppConfigContext, defaultAppConfig } from '../../../AppConfigContext'
import {
  isAllowedOrigin,
  isHostCompatible,
} from '../../../features/AppManager/install/installGate'
import { migrateLegacyApps } from '../../../features/AppManager/install/migrateLegacyApps'
import { loadRemoteApp } from '../../../features/AppManager/loader/loadRemoteApp'
import { AppCatalogEntry } from '../../../models/AppModel/AppCatalogEntry'
import { AppStatus } from '../../../models/AppModel/AppStatus'
import { useAppStore } from './AppStore'
import { useMessageStore } from './MessageStore'
import { appRegistry, useAppManager } from './useAppManager'
import { useWorkspaceStore } from './WorkspaceStore'

// Stub the app-api/core barrel — its layout API transitively imports the
// ESM-only @cosmograph/cosmos, which jest cannot transform. useAppManager only
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

vi.mock('../../../features/AppManager/manifest/obtainCatalogEntries', () => ({
  obtainCatalogEntries: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../../features/AppManager/install/migrateLegacyApps', () => ({
  migrateLegacyApps: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../features/AppManager/install/installGate', () => ({
  isAllowedOrigin: vi.fn(() => true),
  isHostCompatible: vi.fn(() => true),
}))

vi.mock('./appLifecycle', () => ({
  mountApp: vi.fn().mockResolvedValue(undefined),
  unmountApp: vi.fn().mockResolvedValue(undefined),
  unmountAllApps: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../features/AppManager/loader/loadRemoteApp', () => ({
  loadRemoteApp: vi.fn(),
}))

const mockIsAllowedOrigin = isAllowedOrigin as Mock
const mockIsHostCompatible = isHostCompatible as Mock
const mockMigrate = migrateLegacyApps as Mock
const mockLoadRemoteApp = loadRemoteApp as Mock

const entry = (id: string, version = '1.0.0'): AppCatalogEntry => ({
  id,
  url: `https://apps.cytoscape.org/web/${id}/${version}/remoteEntry.js`,
  author: 'Test',
  name: `${id} app`,
  version,
})

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(AppConfigContext.Provider, { value: defaultAppConfig }, children)

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
    mockIsHostCompatible.mockReturnValue(true)
    appRegistry.clear()
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
  })

  describe('status reconciliation', () => {
    it('creates a source:manifest record when a manifest app is activated', async () => {
      // A manifest app present in the catalog but not yet in installedApps
      mockLoadRemoteApp.mockImplementation(
        async (id: string, _url: string, registry: Map<string, unknown>) => {
          const app = { id, name: id, status: AppStatus.Inactive }
          registry.set(id, app)
          return app
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
          return app
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
})
