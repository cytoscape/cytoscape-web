import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getCyNetworkFromCx2 } from '../../models/CxModel/impl'
import {
  CyNetworkCacheMissError,
  getCyNetworkFromDb,
  getNetworkSummaryFromDb,
} from '../db'
import { fetchNdexNetwork } from '../external-api/ndex'
import { useCredentialStore } from './stores/CredentialStore'
import { useNetworkStore } from './stores/NetworkStore'
import { useOpaqueAspectStore } from './stores/OpaqueAspectStore'
import { useTableStore } from './stores/TableStore'
import { useUndoStore } from './stores/UndoStore'
import { useViewModelStore } from './stores/ViewModelStore'
import { useVisualStyleStore } from './stores/VisualStyleStore'
import { useLoadCyNetwork } from './useLoadCyNetwork'

vi.mock('../db', () => ({
  // The real class: the loader classifies failures with `instanceof`, so a
  // stub would make every rejection look like a hard DB error.
  CyNetworkCacheMissError: class CyNetworkCacheMissError extends Error {
    constructor(id: string, missing: string) {
      super(`${missing} not found in IndexedDB for network ${id}`)
      this.name = 'CyNetworkCacheMissError'
    }
  },
  getCyNetworkFromDb: vi.fn(),
  getNetworkSummaryFromDb: vi.fn(),
}))

vi.mock('../external-api/ndex', () => ({
  fetchNdexNetwork: vi.fn(),
}))

vi.mock('../../models/CxModel/impl', () => ({
  getCyNetworkFromCx2: vi.fn(),
}))

const NET_ID = 'net-1'
const cachedNetwork = { network: { id: NET_ID } } as any
const convertedNetwork = { network: { id: `${NET_ID}-from-cx2` } } as any

const loadCyNetwork = () => renderHook(() => useLoadCyNetwork()).result.current

describe('useLoadCyNetwork', () => {
  const originalGetToken = useCredentialStore.getState().getToken

  beforeEach(() => {
    vi.mocked(getCyNetworkFromDb).mockReset()
    vi.mocked(getNetworkSummaryFromDb).mockReset()
    vi.mocked(fetchNdexNetwork).mockReset()
    vi.mocked(getCyNetworkFromCx2).mockReset()
  })

  afterEach(() => {
    useCredentialStore.setState({ getToken: originalGetToken })
    vi.clearAllMocks()
  })

  describe('cache and NDEx fallback', () => {
    it('returns the cached network without touching NDEx', async () => {
      vi.mocked(getCyNetworkFromDb).mockResolvedValue(cachedNetwork)

      const result = await loadCyNetwork()(NET_ID)

      expect(result).toBe(cachedNetwork)
      expect(fetchNdexNetwork).not.toHaveBeenCalled()
    })

    it('on cache miss, fetches from NDEx and converts the validated CX2', async () => {
      vi.mocked(getCyNetworkFromDb).mockRejectedValue(
        new CyNetworkCacheMissError(NET_ID, 'Network'),
      )
      vi.mocked(getNetworkSummaryFromDb).mockResolvedValue({
        isNdex: true,
      } as any)
      const cx2 = [{ status: [] }] as any
      vi.mocked(fetchNdexNetwork).mockResolvedValue(cx2)
      vi.mocked(getCyNetworkFromCx2).mockReturnValue(convertedNetwork)

      const result = await loadCyNetwork()(NET_ID, 'token-123')

      expect(fetchNdexNetwork).toHaveBeenCalledWith(NET_ID, 'token-123')
      expect(getCyNetworkFromCx2).toHaveBeenCalledWith(NET_ID, cx2)
      expect(result).toBe(convertedNetwork)
    })

    it('also tries NDEx when no summary exists (unknown origin)', async () => {
      vi.mocked(getCyNetworkFromDb).mockRejectedValue(
        new CyNetworkCacheMissError(NET_ID, 'Network'),
      )
      vi.mocked(getNetworkSummaryFromDb).mockResolvedValue(undefined as any)
      vi.mocked(fetchNdexNetwork).mockResolvedValue([] as any)
      vi.mocked(getCyNetworkFromCx2).mockReturnValue(convertedNetwork)

      await expect(loadCyNetwork()(NET_ID)).resolves.toBe(convertedNetwork)
    })

    // A local-only network missing from cache is unrecoverable data loss —
    // it must NOT fall through to NDEx (which cannot have it).
    it('throws for a local-only network missing from cache instead of asking NDEx', async () => {
      vi.mocked(getCyNetworkFromDb).mockRejectedValue(
        new CyNetworkCacheMissError(NET_ID, 'Network'),
      )
      vi.mocked(getNetworkSummaryFromDb).mockResolvedValue({
        isNdex: false,
        name: 'My Local Network',
      } as any)

      await expect(loadCyNetwork()(NET_ID)).rejects.toThrow(
        /Local network "My Local Network".*cannot be retrieved from NDEx/,
      )
      expect(fetchNdexNetwork).not.toHaveBeenCalled()
    })

    it('propagates NDEx fetch failures', async () => {
      vi.mocked(getCyNetworkFromDb).mockRejectedValue(
        new CyNetworkCacheMissError(NET_ID, 'Network'),
      )
      vi.mocked(getNetworkSummaryFromDb).mockResolvedValue({
        isNdex: true,
      } as any)
      vi.mocked(fetchNdexNetwork).mockRejectedValue(new Error('404 Not Found'))

      await expect(loadCyNetwork()(NET_ID)).rejects.toThrow('404 Not Found')
    })
  })

  // A network imported in this session lives fully in the in-memory stores
  // before its debounced IndexedDB persist lands, so the first navigation to
  // it can race the write and miss the cache (#665). The loader must fall
  // back to the stores instead of declaring a local network lost — but only
  // on a miss: when the DB read succeeds it stays authoritative, because
  // cross-tab sync deliberately leaves non-current networks stale in memory.
  describe('in-memory store fallback (#665)', () => {
    const storeNetwork = { id: NET_ID, nodes: [], edges: [] } as any
    const nodeTable = { id: NET_ID, columns: [], rows: new Map() } as any
    const edgeTable = { id: NET_ID, columns: [], rows: new Map() } as any
    const viewModel = {
      id: NET_ID,
      viewId: `${NET_ID}-view-1`,
      type: 'nodeLink',
      nodeViews: {},
      edgeViews: {},
      selectedNodes: [],
      selectedEdges: [],
    } as any
    const visualStyle = { nodeShape: {} } as any
    const undoRedoStack = {
      undoStack: [{ id: 'edit-1' }],
      redoStack: [],
    } as any

    const seedStores = () => {
      useNetworkStore.setState({
        networks: new Map([[NET_ID, storeNetwork]]),
      })
      useTableStore.setState({
        tables: { [NET_ID]: { nodeTable, edgeTable } },
      } as any)
      useViewModelStore.setState({
        viewModels: { [NET_ID]: [viewModel] },
      } as any)
      useVisualStyleStore.setState({
        visualStyles: { [NET_ID]: visualStyle },
        styleSets: {},
      } as any)
      useUndoStore.setState({
        undoRedoStacks: { [NET_ID]: undoRedoStack },
      } as any)
      useOpaqueAspectStore.setState({
        opaqueAspects: { [NET_ID]: { metaAspect: [{ n: 1 }] } },
      } as any)
    }

    afterEach(() => {
      useNetworkStore.setState({ networks: new Map() })
      useTableStore.setState({ tables: {} } as any)
      useViewModelStore.setState({ viewModels: {} } as any)
      useVisualStyleStore.setState({ visualStyles: {}, styleSets: {} } as any)
      useUndoStore.setState({ undoRedoStacks: {} } as any)
      useOpaqueAspectStore.setState({ opaqueAspects: {} } as any)
    })

    it('assembles the network from the stores when the DB read misses', async () => {
      vi.mocked(getCyNetworkFromDb).mockRejectedValue(
        new CyNetworkCacheMissError(NET_ID, 'Network'),
      )
      // Without the fallback this summary makes the loader throw the
      // "local network is not found in cache" error — the #665 symptom.
      vi.mocked(getNetworkSummaryFromDb).mockResolvedValue({
        isNdex: false,
        name: 'Imported Network',
      } as any)
      seedStores()

      const result = await loadCyNetwork()(NET_ID)

      expect(result.network).toBe(storeNetwork)
      expect(result.nodeTable).toBe(nodeTable)
      expect(result.edgeTable).toBe(edgeTable)
      expect(result.visualStyle).toBe(visualStyle)
      expect(result.visualStyleSet).toBeDefined()
      expect(result.undoRedoStack).toBe(undoRedoStack)
      expect(result.otherAspects).toEqual([{ metaAspect: [{ n: 1 }] }])
      expect(fetchNdexNetwork).not.toHaveBeenCalled()
    })

    it('returns copies of the store view models, not the frozen originals', async () => {
      vi.mocked(getCyNetworkFromDb).mockRejectedValue(
        new CyNetworkCacheMissError(NET_ID, 'Network'),
      )
      seedStores()

      const result = await loadCyNetwork()(NET_ID)

      // ViewModelStore.add mutates the view it is given (viewId/type
      // defaults, selection carry-over) and store state is Immer-frozen, so
      // handing back the stored object would throw when the caller re-adds it.
      expect(result.networkViews[0]).not.toBe(viewModel)
      expect(result.networkViews[0]).toEqual(viewModel)
    })

    it('still reports a lost local network when the stores are only partially populated', async () => {
      vi.mocked(getCyNetworkFromDb).mockRejectedValue(
        new CyNetworkCacheMissError(NET_ID, 'Network'),
      )
      vi.mocked(getNetworkSummaryFromDb).mockResolvedValue({
        isNdex: false,
        name: 'My Local Network',
      } as any)
      // Network present but no tables/views/style: not a usable copy
      useNetworkStore.setState({
        networks: new Map([[NET_ID, storeNetwork]]),
      })

      await expect(loadCyNetwork()(NET_ID)).rejects.toThrow(
        /Local network "My Local Network".*cannot be retrieved from NDEx/,
      )
      expect(fetchNdexNetwork).not.toHaveBeenCalled()
    })

    it('re-throws a non-miss DB failure instead of using the stores', async () => {
      // A validation/deserialization/Dexie failure means the row exists but is
      // unusable. Substituting the stores would hide the corruption.
      vi.mocked(getCyNetworkFromDb).mockRejectedValue(
        new Error('Invalid network view in IndexedDB'),
      )
      seedStores()

      await expect(loadCyNetwork()(NET_ID)).rejects.toThrow(
        'Invalid network view in IndexedDB',
      )
      expect(getNetworkSummaryFromDb).not.toHaveBeenCalled()
      expect(fetchNdexNetwork).not.toHaveBeenCalled()
    })

    it('prefers the DB copy when the cache read succeeds', async () => {
      // Cross-tab sync leaves non-current networks stale in the stores and
      // relies on the network swap re-reading the DB — the fallback must
      // never shadow a successful DB read.
      vi.mocked(getCyNetworkFromDb).mockResolvedValue(cachedNetwork)
      seedStores()

      const result = await loadCyNetwork()(NET_ID)

      expect(result).toBe(cachedNetwork)
      expect(result.network).not.toBe(storeNetwork)
    })
  })

  // CredentialStore's auth gate blocks getToken until the boot SSO check
  // settles, so these assert the loader only reaches that gate when it
  // genuinely has to fetch — which is why a returning user's cached workspace
  // paints without waiting for SSO.
  describe('token resolution', () => {
    it('returns a cached network without waiting for a token', async () => {
      const getTokenSpy = vi.fn(
        // Never resolves: awaiting it would hang the test, proving cached
        // network content doesn't wait for the SSO check.
        () => new Promise<string>(() => undefined),
      )
      useCredentialStore.setState({ getToken: getTokenSpy })
      vi.mocked(getCyNetworkFromDb).mockResolvedValue(cachedNetwork)

      const result = await loadCyNetwork()(NET_ID)

      expect(result).toBe(cachedNetwork)
      expect(getTokenSpy).not.toHaveBeenCalled()
      expect(fetchNdexNetwork).not.toHaveBeenCalled()
    })

    it('lazily resolves the token from CredentialStore on a cache miss', async () => {
      const getTokenSpy = vi.fn().mockResolvedValue('lazy-token')
      useCredentialStore.setState({ getToken: getTokenSpy })
      vi.mocked(getCyNetworkFromDb).mockRejectedValue(
        new CyNetworkCacheMissError(NET_ID, 'Network'),
      )
      vi.mocked(getNetworkSummaryFromDb).mockResolvedValue(undefined as any)
      vi.mocked(fetchNdexNetwork).mockResolvedValue([] as any)
      vi.mocked(getCyNetworkFromCx2).mockReturnValue(convertedNetwork)

      const result = await loadCyNetwork()(NET_ID)

      expect(getTokenSpy).toHaveBeenCalledTimes(1)
      expect(fetchNdexNetwork).toHaveBeenCalledWith(NET_ID, 'lazy-token')
      expect(result).toBe(convertedNetwork)
    })

    it('prefers an explicitly-passed access token over the store token', async () => {
      const getTokenSpy = vi.fn().mockResolvedValue('store-token')
      useCredentialStore.setState({ getToken: getTokenSpy })
      vi.mocked(getCyNetworkFromDb).mockRejectedValue(
        new CyNetworkCacheMissError(NET_ID, 'Network'),
      )
      vi.mocked(getNetworkSummaryFromDb).mockResolvedValue(undefined as any)
      vi.mocked(fetchNdexNetwork).mockResolvedValue([] as any)
      vi.mocked(getCyNetworkFromCx2).mockReturnValue(convertedNetwork)

      await loadCyNetwork()(NET_ID, 'explicit-token')

      expect(getTokenSpy).not.toHaveBeenCalled()
      expect(fetchNdexNetwork).toHaveBeenCalledWith(NET_ID, 'explicit-token')
    })
  })
})
