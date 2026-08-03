import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAppStore } from '@/data/hooks/stores/AppStore'
import { useMessageStore } from '@/data/hooks/stores/MessageStore'
import { useNetworkSummaryStore } from '@/data/hooks/stores/NetworkSummaryStore'
import { useWorkspaceStore } from '@/data/hooks/stores/WorkspaceStore'
import { resetBootStateForTesting } from '../bootState'
import { resetBootMetricsForTesting } from '../metrics/bootMarks'
import { resetBootRunnerForTesting } from '../runBoot'
import type { AppShellBootContext } from './appShellBootContext'
import { runAppShellBoot } from './runAppShellBoot'

vi.mock('../../app-api/event-bus/initEventBus', () => ({
  initEventBus: vi.fn(),
}))

const getWorkspaceFromDb = vi.fn()
const getUiStateFromDb = vi.fn()
const putNetworkSummaryToDb = vi.fn()

// Partial mock: the stores these steps drive also reach into the db module
// (UiStateStore persists on every set), so replacing it wholesale breaks them.
vi.mock('../../data/db', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../data/db')>()),
  getWorkspaceFromDb: (...args: unknown[]) => getWorkspaceFromDb(...args),
  getUiStateFromDb: (...args: unknown[]) => getUiStateFromDb(...args),
  putNetworkSummaryToDb: (...args: unknown[]) => putNetworkSummaryToDb(...args),
}))

const fetchNdexSummaries = vi.fn()
vi.mock('../../data/external-api/ndex', () => ({
  fetchNdexSummaries: (...args: unknown[]) => fetchNdexSummaries(...args),
}))

const fetchUrlCx = vi.fn()
vi.mock('../../models/CxModel/fetchUrlCxUtil', () => ({
  fetchUrlCx: (...args: unknown[]) => fetchUrlCx(...args),
}))

const WORKSPACE = {
  name: 'Test Workspace',
  id: 'ws-1',
  currentNetworkId: 'net-1',
  networkIds: ['net-1'],
  localModificationTime: new Date(),
  creationTime: new Date(),
  networkModified: {},
}

const ALLOWED_ORIGIN = 'https://apps.example.com'

/** A single-entry React app manifest, as the App Store serves it: an array. */
const REACT_MANIFEST = [
  {
    id: 'mcodeweb',
    name: 'MCODE Web',
    version: '0.1.0',
    url: `${ALLOWED_ORIGIN}/web/mcodeweb/0.1.0/remoteEntry.js`,
    author: 'Bader Lab',
  },
]

/** Service-app metadata, as an endpoint serves it: a bare object, no `url`. */
const SERVICE_METADATA = {
  name: 'Update tables example',
  version: '0.9.0',
  cyWebActions: ['updateTables'],
  author: null,
  citation: null,
  parameters: [],
}

/** Resolves each URL to its own payload, so concurrent fetches cannot swap. */
const stubFetchByUrl = (payloads: Record<string, unknown>): void => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      payloads[url] === undefined
        ? { ok: false, status: 404 }
        : { ok: true, status: 200, json: async () => payloads[url] },
    ),
  )
}

const makeContext = (
  overrides: Partial<AppShellBootContext> = {},
): AppShellBootContext => ({
  search: new URLSearchParams(),
  networkIdParam: undefined,
  pathname: '/',
  navigate: vi.fn(),
  loadNetworkSummaries: vi.fn().mockResolvedValue({}),
  appInstallAllowedOrigins: [ALLOWED_ORIGIN],
  ...overrides,
})

beforeEach(() => {
  getWorkspaceFromDb.mockResolvedValue({ ...WORKSPACE, networkIds: ['net-1'] })
  getUiStateFromDb.mockResolvedValue(undefined)
  putNetworkSummaryToDb.mockResolvedValue(undefined)
})

afterEach(() => {
  resetBootRunnerForTesting()
  resetBootStateForTesting()
  resetBootMetricsForTesting()
  vi.clearAllMocks()
  // Unconditional, unlike a manual call at the end of a test body: an
  // assertion that throws first would otherwise leak a stubbed global fetch
  // into every test that follows.
  vi.unstubAllGlobals()
})

describe('runAppShellBoot: happy path', () => {
  it('publishes the workspace and cleans the URL', async () => {
    const ctx = makeContext()

    await runAppShellBoot(ctx)

    expect(useWorkspaceStore.getState().workspace.id).toBe('ws-1')
    expect(ctx.navigate).toHaveBeenCalledWith(
      { pathname: '/ws-1/networks/net-1', search: '' },
      { replace: true },
    )
  })

  it('fires cywebapi:ready after the workspace is published', async () => {
    const order: string[] = []
    const unsubscribe = useWorkspaceStore.subscribe(() => {
      order.push('workspace')
    })
    window.addEventListener('cywebapi:ready', () => order.push('ready'), {
      once: true,
    })

    await runAppShellBoot(makeContext())
    unsubscribe()

    expect(order.indexOf('workspace')).toBeLessThan(order.indexOf('ready'))
  })
})

describe('runAppShellBoot: failure isolation', () => {
  // This is the regression that motivated the decomposition. Previously a
  // throw here meant setWorkspace, cywebapi:ready and the navigate() URL
  // cleanup were all skipped: the shell stayed up forever, and because the
  // params were never stripped, reloading reproduced the same failure.
  it('still reaches a usable workspace when the workspace read fails', async () => {
    getWorkspaceFromDb.mockRejectedValue(new Error('VersionError'))
    const ctx = makeContext()

    await runAppShellBoot(ctx)

    expect(ctx.navigate).toHaveBeenCalled()
    expect(useWorkspaceStore.getState().workspace.id).not.toBe('')
  })

  it('still publishes when the network summaries fail to load', async () => {
    const ctx = makeContext({
      loadNetworkSummaries: vi.fn().mockRejectedValue(new Error('NDEx 503')),
    })

    await runAppShellBoot(ctx)

    expect(ctx.navigate).toHaveBeenCalled()
  })

  it('still publishes when a deep-linked network cannot be resolved', async () => {
    fetchNdexSummaries.mockRejectedValue(new Error('NDEx unreachable'))
    const ctx = makeContext({
      networkIdParam: 'missing-net',
      pathname: '/ws-1/networks/missing-net',
    })

    await runAppShellBoot(ctx)

    expect(useWorkspaceStore.getState().workspace.id).toBe('ws-1')
    expect(ctx.navigate).toHaveBeenCalled()
  })

  it('still publishes when a ?import= URL fails, and reports it', async () => {
    fetchUrlCx.mockRejectedValue(new Error('404'))
    const ctx = makeContext({
      search: new URLSearchParams('import=https://example.com/bad.cx'),
    })

    await runAppShellBoot(ctx)

    expect(ctx.navigate).toHaveBeenCalled()
    expect(useWorkspaceStore.getState().workspace.id).toBe('ws-1')
  })

  it('reports a missing deep-linked network without aborting', async () => {
    fetchNdexSummaries.mockResolvedValue([])
    const ctx = makeContext({
      networkIdParam: 'ghost',
      pathname: '/ws-1/networks/ghost',
    })

    await runAppShellBoot(ctx)

    expect(ctx.navigate).toHaveBeenCalled()
  })
})

describe('runAppShellBoot: deep links and imports', () => {
  it('adds a resolved deep-linked network and makes it current', async () => {
    fetchNdexSummaries.mockResolvedValue([
      { externalId: 'net-2', name: 'Net 2' },
    ])
    const ctx = makeContext({
      networkIdParam: 'net-2',
      pathname: '/ws-1/networks/net-2',
    })

    await runAppShellBoot(ctx)

    const { workspace } = useWorkspaceStore.getState()
    expect(workspace.networkIds).toContain('net-2')
    expect(workspace.currentNetworkId).toBe('net-2')
    expect(useNetworkSummaryStore.getState().summaries['net-2']).toBeDefined()
  })

  it('keeps importing after one URL fails', async () => {
    fetchUrlCx.mockRejectedValueOnce(new Error('404')).mockResolvedValueOnce({
      summary: { externalId: 'imported-1' },
      cyNetwork: {
        network: { id: 'imported-1' },
        nodeTable: {},
        edgeTable: {},
        visualStyle: {},
        networkViews: [{}],
        visualStyleOptions: {},
      },
    })

    const ctx = makeContext({
      search: new URLSearchParams(
        'import=https://example.com/bad.cx&import=https://example.com/good.cx',
      ),
    })

    await runAppShellBoot(ctx)

    expect(fetchUrlCx).toHaveBeenCalledTimes(2)
    expect(useWorkspaceStore.getState().workspace.currentNetworkId).toBe(
      'imported-1',
    )
  })
})

describe('runAppShellBoot: per-tab network resolution', () => {
  afterEach(() => {
    window.sessionStorage.clear()
  })

  it('prefers this tab’s remembered network over the shared workspace field', async () => {
    // The shared workspace row says net-1, but this tab was last showing net-2:
    // another tab must not be able to swap this one's network (CW-722).
    getWorkspaceFromDb.mockResolvedValue({
      ...WORKSPACE,
      currentNetworkId: 'net-1',
      networkIds: ['net-1', 'net-2'],
    })
    window.sessionStorage.setItem('cyweb.tab.networkId', 'net-2')

    const ctx = makeContext()
    await runAppShellBoot(ctx)

    expect(useWorkspaceStore.getState().workspace.currentNetworkId).toBe(
      'net-2',
    )
    expect(ctx.navigate).toHaveBeenCalledWith(
      { pathname: '/ws-1/networks/net-2', search: '' },
      { replace: true },
    )
  })

  it('keeps an unresolvable deep-linked id so the error names the requested network', async () => {
    // Redirecting to an unrelated local network instead would leave the user
    // reading an error about an address they never typed (CW-514).
    fetchNdexSummaries.mockRejectedValue(new Error('NDEx unreachable'))
    const ctx = makeContext({
      networkIdParam: 'missing-net',
      pathname: '/ws-1/networks/missing-net',
    })

    await runAppShellBoot(ctx)

    expect(useWorkspaceStore.getState().workspace.currentNetworkId).toBe(
      'missing-net',
    )
  })
})

describe('runAppShellBoot: install intents', () => {
  const MANIFEST_URL = `${ALLOWED_ORIGIN}/web/mcodeweb/manifest.json`
  const SERVICE_URL = 'https://svc.example.com/service'

  beforeEach(() => {
    useMessageStore.getState().resetMessages()
  })

  afterEach(() => {
    useAppStore.setState({ serviceApps: {} })
  })

  const messages = (): string[] =>
    useMessageStore.getState().messages.map((m) => m.message)

  it('classifies an array manifest as a React app without installing it', async () => {
    stubFetchByUrl({ [MANIFEST_URL]: REACT_MANIFEST })
    const ctx = makeContext({
      search: new URLSearchParams({ installApp: MANIFEST_URL }),
    })

    const result = await runAppShellBoot(ctx)

    expect(result.pendingAppInstalls).toHaveLength(1)
    const pending = result.pendingAppInstalls[0]
    expect(pending.type).toBe('client')
    if (pending.type === 'client') {
      expect(pending.entry.id).toBe('mcodeweb')
      expect(pending.entry.name).toBe('MCODE Web')
    }
    // Nothing may be installed before the user has seen the dialog.
    expect(useWorkspaceStore.getState().workspace.installedApps ?? []).toEqual(
      [],
    )
  })

  it('classifies service metadata as a service app and carries it for display', async () => {
    stubFetchByUrl({ [SERVICE_URL]: SERVICE_METADATA })
    const ctx = makeContext({
      search: new URLSearchParams({ installApp: SERVICE_URL }),
    })

    const result = await runAppShellBoot(ctx)

    expect(result.pendingAppInstalls).toHaveLength(1)
    const pending = result.pendingAppInstalls[0]
    expect(pending.type).toBe('service')
    if (pending.type === 'service') {
      expect(pending.metadata.name).toBe('Update tables example')
    }
    // Registration happens on confirm, not here.
    expect(useAppStore.getState().serviceApps).toEqual({})
  })

  it('routes a repeated installApp with one of each kind, preserving order', async () => {
    stubFetchByUrl({
      [MANIFEST_URL]: REACT_MANIFEST,
      [SERVICE_URL]: SERVICE_METADATA,
    })
    const ctx = makeContext({
      search: new URLSearchParams(
        `installApp=${MANIFEST_URL}&installApp=${SERVICE_URL}`,
      ),
    })

    const result = await runAppShellBoot(ctx)

    expect(result.pendingAppInstalls.map((item) => item.type)).toEqual([
      'client',
      'service',
    ])
  })

  it('rejects a React app whose bundle is not from an allowed origin', async () => {
    stubFetchByUrl({
      [MANIFEST_URL]: [
        {
          ...REACT_MANIFEST[0],
          url: 'https://evil.example.com/remoteEntry.js',
        },
      ],
    })
    const ctx = makeContext({
      search: new URLSearchParams({ installApp: MANIFEST_URL }),
    })

    const result = await runAppShellBoot(ctx)

    expect(result.pendingAppInstalls).toEqual([])
    expect(ctx.navigate).toHaveBeenCalled()
  })

  it('says so instead of silently doing nothing when already installed', async () => {
    // Skipping in silence made an App Store link look broken: no dialog, no
    // message, no way to tell a working link from a dead one.
    useAppStore.setState({
      serviceApps: { [SERVICE_URL]: { url: SERVICE_URL } as never },
    })
    stubFetchByUrl({ [SERVICE_URL]: SERVICE_METADATA })
    const ctx = makeContext({
      search: new URLSearchParams({ installApp: SERVICE_URL }),
    })

    const result = await runAppShellBoot(ctx)

    expect(result.pendingAppInstalls).toEqual([])
    expect(messages()).toContain('Already installed: Update tables example')
  })

  it('rejects a relative or non-http URL without fetching it', async () => {
    // A relative value would otherwise resolve against Cytoscape Web's own
    // origin and fetch something the link never named.
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const ctx = makeContext({
      search: new URLSearchParams(
        'installApp=/api/internal&installApp=file:///etc/passwd',
      ),
    })

    const result = await runAppShellBoot(ctx)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.pendingAppInstalls).toEqual([])
    expect(messages()).toHaveLength(2)
    expect(ctx.navigate).toHaveBeenCalled()
  })

  it('lists an app once when two manifest URLs resolve to the same entry', async () => {
    const mirror = `${ALLOWED_ORIGIN}/mirror/manifest.json`
    stubFetchByUrl({
      [MANIFEST_URL]: REACT_MANIFEST,
      [mirror]: REACT_MANIFEST,
    })
    const ctx = makeContext({
      search: new URLSearchParams(
        `installApp=${MANIFEST_URL}&installApp=${mirror}`,
      ),
    })

    const result = await runAppShellBoot(ctx)

    expect(result.pendingAppInstalls).toHaveLength(1)
  })

  it('does not block the boot when an install intent fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    )
    const ctx = makeContext({
      search: new URLSearchParams('installApp=https://apps.example.com/m.json'),
    })

    await runAppShellBoot(ctx)

    expect(ctx.navigate).toHaveBeenCalled()
  })

  it('keeps booting when the payload is neither a manifest nor service metadata', async () => {
    stubFetchByUrl({ [MANIFEST_URL]: { hello: 'world' } })
    const ctx = makeContext({
      search: new URLSearchParams({ installApp: MANIFEST_URL }),
    })

    const result = await runAppShellBoot(ctx)

    expect(result.pendingAppInstalls).toEqual([])
    expect(ctx.navigate).toHaveBeenCalled()
  })
})
