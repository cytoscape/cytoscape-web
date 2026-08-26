// @vitest-environment node
//
// src/app-api/core/appDataApi.test.ts
// Both storage tiers behind createAppDataApi, with the three stores it touches
// replaced by in-memory doubles that reproduce their real semantics.

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  APP_DATA_GLOBAL_SCOPE,
  CY_APP_DATA_ASPECT_TAG,
} from '../../models/AppDataModel'
import { AppCodes } from '../types/ApiResult'
import { MAX_APP_DATA_VALUE_BYTES } from '../types/AppDataTypes'
import { createAppDataApi } from './appDataApi'

// ── Mock stores ──────────────────────────────────────────────────────────────

// AppDataStore: networkId → appId → key → value
let localData: Record<string, Record<string, Record<string, unknown>>> = {}

const mockAppDataActions = {
  set: vi.fn(
    (networkId: string, appId: string, key: string, value: unknown) => {
      localData[networkId] ??= {}
      localData[networkId][appId] ??= {}
      localData[networkId][appId][key] = value
    },
  ),
  remove: vi.fn((networkId: string, appId: string, key: string) => {
    delete localData[networkId]?.[appId]?.[key]
  }),
}

vi.mock('../../data/hooks/stores/AppDataStore', () => ({
  useAppDataStore: {
    getState: vi.fn(() => ({
      ...mockAppDataActions,
      get appData() {
        return localData
      },
    })),
  },
}))

// OpaqueAspectStore: networkId → aspectName → any[]
let aspects: Record<string, Record<string, any[]>> = {}

const mockOpaqueActions = {
  update: vi.fn((networkId: string, name: string, data: any[]) => {
    aspects[networkId] ??= {}
    aspects[networkId][name] = [...data]
  }),
}

vi.mock('../../data/hooks/stores/OpaqueAspectStore', () => ({
  useOpaqueAspectStore: {
    getState: vi.fn(() => ({
      ...mockOpaqueActions,
      get opaqueAspects() {
        return aspects
      },
    })),
  },
}))

let networkIds: string[] = []
const setNetworkModified = vi.fn()

vi.mock('../../data/hooks/stores/WorkspaceStore', () => ({
  useWorkspaceStore: {
    getState: vi.fn(() => ({
      setNetworkModified,
      get workspace() {
        return { networkIds }
      },
    })),
  },
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

const NET_A = 'net-a'
const NET_B = 'net-b'

/** The `cyAppData` records currently on a network. */
const records = (networkId: string): any[] =>
  aspects[networkId]?.[CY_APP_DATA_ASPECT_TAG] ?? []

beforeEach(() => {
  localData = {}
  aspects = {}
  networkIds = [NET_A, NET_B]
  vi.clearAllMocks()
})

// ── Local tier (the default) ─────────────────────────────────────────────────

describe('createAppDataApi — local tier', () => {
  it('round-trips a value per network', () => {
    const api = createAppDataApi('analyzer')

    expect(api.set(NET_A, 'results', { degree: 3 }).success).toBe(true)
    expect(api.set(NET_B, 'results', { degree: 7 }).success).toBe(true)

    const a = api.get(NET_A, 'results')
    const b = api.get(NET_B, 'results')
    expect(a.success && a.data.value).toEqual({ degree: 3 })
    expect(b.success && b.data.value).toEqual({ degree: 7 })
  })

  it('writes nothing to the opaque aspect store', () => {
    createAppDataApi('analyzer').set(NET_A, 'results', [1, 2, 3])

    expect(mockOpaqueActions.update).not.toHaveBeenCalled()
    expect(records(NET_A)).toEqual([])
  })

  it('does not mark the network modified', () => {
    createAppDataApi('analyzer').set(NET_A, 'results', [1])
    expect(setNetworkModified).not.toHaveBeenCalled()
  })

  it('fails with APP11 for a key that was never written', () => {
    const result = createAppDataApi('analyzer').get(NET_A, 'missing')

    expect(result.success).toBe(false)
    expect(!result.success && result.error.code).toBe(
      AppCodes.APP_DATA_NOT_FOUND.code,
    )
  })

  it('distinguishes a stored null from an absent key', () => {
    const api = createAppDataApi('analyzer')
    api.set(NET_A, 'nothing', null)

    const result = api.get(NET_A, 'nothing')
    expect(result.success).toBe(true)
    expect(result.success && result.data.value).toBeNull()
  })

  it('stores a detached copy, so mutating the caller`s object changes nothing', () => {
    const api = createAppDataApi('analyzer')
    const value = { scores: [1] }
    api.set(NET_A, 'results', value)

    value.scores.push(2)

    const result = api.get(NET_A, 'results')
    expect(result.success && result.data.value).toEqual({ scores: [1] })
  })

  it('removes a key, and remove on an absent key still succeeds', () => {
    const api = createAppDataApi('analyzer')
    api.set(NET_A, 'results', 1)

    expect(api.remove(NET_A, 'results').success).toBe(true)
    expect(api.get(NET_A, 'results').success).toBe(false)
    expect(api.remove(NET_A, 'results').success).toBe(true)
  })

  it('reports keys when destructured off the API object', () => {
    // `const { keys } = ctx.apis.appData` is ordinary usage, and it leaves
    // `this` undefined — keys() used to return an APP3 failure.
    const api = createAppDataApi('analyzer')
    api.set(NET_A, 'a', 1)
    const { keys } = api

    const result = keys(NET_A)

    expect(result.success && result.data.keys).toEqual(['a'])
  })

  it('reports keys and entries for one network only', () => {
    const api = createAppDataApi('analyzer')
    api.set(NET_A, 'a', 1)
    api.set(NET_A, 'b', 2)
    api.set(NET_B, 'c', 3)

    const keys = api.keys(NET_A)
    const all = api.getAll(NET_A)
    expect(keys.success && keys.data.keys.sort()).toEqual(['a', 'b'])
    expect(all.success && all.data.entries).toEqual({ a: 1, b: 2 })
  })

  it('returns empty results for a network with no entries', () => {
    const api = createAppDataApi('analyzer')
    const keys = api.keys(NET_A)
    const all = api.getAll(NET_A)
    expect(keys.success && keys.data.keys).toEqual([])
    expect(all.success && all.data.entries).toEqual({})
  })
})

// ── App isolation ────────────────────────────────────────────────────────────

describe('createAppDataApi — app isolation', () => {
  it('app A cannot read app B`s key', () => {
    createAppDataApi('app-b').set(NET_A, 'secret', 'b-value')

    const result = createAppDataApi('app-a').get(NET_A, 'secret')

    expect(result.success).toBe(false)
    expect(!result.success && result.error.code).toBe(
      AppCodes.APP_DATA_NOT_FOUND.code,
    )
  })

  it('app A writing the same key does not overwrite app B`s value', () => {
    const b = createAppDataApi('app-b')
    b.set(NET_A, 'shared', 'b-value')
    createAppDataApi('app-a').set(NET_A, 'shared', 'a-value')

    const result = b.get(NET_A, 'shared')
    expect(result.success && result.data.value).toBe('b-value')
  })

  it('getAll never reports another app`s entries', () => {
    createAppDataApi('app-b').set(NET_A, 'b-key', 1)
    createAppDataApi('app-a').set(NET_A, 'a-key', 2)

    const result = createAppDataApi('app-a').getAll(NET_A)
    expect(result.success && result.data.entries).toEqual({ 'a-key': 2 })
  })

  it('app A removing a key leaves app B`s same-named key alone', () => {
    const b = createAppDataApi('app-b')
    b.set(NET_A, 'shared', 'b-value')
    createAppDataApi('app-a').remove(NET_A, 'shared')

    expect(b.get(NET_A, 'shared').success).toBe(true)
  })
})

// ── Exported tier ────────────────────────────────────────────────────────────

describe('createAppDataApi — exported tier', () => {
  it('writes exactly one cyAppData record', () => {
    createAppDataApi('analyzer').set(
      NET_A,
      'results',
      { degree: 3 },
      {
        export: true,
      },
    )

    expect(records(NET_A)).toEqual([
      { appId: 'analyzer', key: 'results', value: { degree: 3 } },
    ])
  })

  it('upserts rather than appending a second record for the same key', () => {
    const api = createAppDataApi('analyzer')
    api.set(NET_A, 'results', 1, { export: true })
    api.set(NET_A, 'results', 2, { export: true })

    expect(records(NET_A)).toEqual([
      { appId: 'analyzer', key: 'results', value: 2 },
    ])
  })

  it('marks the network modified so an NDEx-backed network is actually saved', () => {
    createAppDataApi('analyzer').set(NET_A, 'results', 1, { export: true })
    expect(setNetworkModified).toHaveBeenCalledWith(NET_A, true)
  })

  it('writes nothing to the local store', () => {
    createAppDataApi('analyzer').set(NET_A, 'results', 1, { export: true })
    expect(mockAppDataActions.set).not.toHaveBeenCalled()
    expect(localData).toEqual({})
  })

  it('is readable through get, getAll and keys alongside local entries', () => {
    const api = createAppDataApi('analyzer')
    api.set(NET_A, 'cache', 'local')
    api.set(NET_A, 'results', 'exported', { export: true })

    const one = api.get(NET_A, 'results')
    const all = api.getAll(NET_A)
    const keys = api.keys(NET_A)
    expect(one.success && one.data.value).toBe('exported')
    expect(all.success && all.data.entries).toEqual({
      cache: 'local',
      results: 'exported',
    })
    expect(keys.success && keys.data.keys.sort()).toEqual(['cache', 'results'])
  })

  it('shares one aspect across apps without collision', () => {
    createAppDataApi('app-a').set(NET_A, 'k', 'a', { export: true })
    createAppDataApi('app-b').set(NET_A, 'k', 'b', { export: true })

    expect(records(NET_A)).toHaveLength(2)
    const a = createAppDataApi('app-a').get(NET_A, 'k')
    const b = createAppDataApi('app-b').get(NET_A, 'k')
    expect(a.success && a.data.value).toBe('a')
    expect(b.success && b.data.value).toBe('b')
  })

  it('preserves records belonging to apps that are not installed', () => {
    aspects[NET_A] = {
      [CY_APP_DATA_ASPECT_TAG]: [
        { appId: 'some-other-host-app', key: 'k', value: 'keep me' },
      ],
    }

    const api = createAppDataApi('analyzer')
    api.set(NET_A, 'results', 1, { export: true })
    api.remove(NET_A, 'results')

    expect(records(NET_A)).toEqual([
      { appId: 'some-other-host-app', key: 'k', value: 'keep me' },
    ])
  })

  it('removes the record and leaves the aspect present but empty', () => {
    const api = createAppDataApi('analyzer')
    api.set(NET_A, 'results', 1, { export: true })

    api.remove(NET_A, 'results')

    expect(records(NET_A)).toEqual([])
    expect(api.get(NET_A, 'results').success).toBe(false)
  })
})

// ── Tier moves ───────────────────────────────────────────────────────────────

describe('createAppDataApi — a key lives in exactly one tier', () => {
  it('moves a local key to the exported tier', () => {
    const api = createAppDataApi('analyzer')
    api.set(NET_A, 'results', 'v1')

    api.set(NET_A, 'results', 'v2', { export: true })

    expect(localData[NET_A]?.analyzer ?? {}).toEqual({})
    expect(records(NET_A)).toEqual([
      { appId: 'analyzer', key: 'results', value: 'v2' },
    ])
    const result = api.get(NET_A, 'results')
    expect(result.success && result.data.value).toBe('v2')
  })

  it('moves an exported key back to the local tier', () => {
    const api = createAppDataApi('analyzer')
    api.set(NET_A, 'results', 'v1', { export: true })

    api.set(NET_A, 'results', 'v2', { export: false })

    expect(records(NET_A)).toEqual([])
    const result = api.get(NET_A, 'results')
    expect(result.success && result.data.value).toBe('v2')
  })
})

// ── App-scoped tier ──────────────────────────────────────────────────────────

describe('createAppDataApi — app-scoped entries', () => {
  it('round-trips a value with no network involved', () => {
    const api = createAppDataApi('analyzer')

    expect(api.setGlobal('prefs', { theme: 'dark' }).success).toBe(true)

    const result = api.getGlobal('prefs')
    expect(result.success && result.data.value).toEqual({ theme: 'dark' })
  })

  it('stores under the global scope, not under any network', () => {
    createAppDataApi('analyzer').setGlobal('prefs', 1)

    expect(mockAppDataActions.set).toHaveBeenCalledWith(
      APP_DATA_GLOBAL_SCOPE,
      'analyzer',
      'prefs',
      1,
    )
  })

  it('never touches the opaque aspect store — there is no network to travel with', () => {
    createAppDataApi('analyzer').setGlobal('prefs', 1)
    expect(mockOpaqueActions.update).not.toHaveBeenCalled()
    expect(setNetworkModified).not.toHaveBeenCalled()
  })

  it('is not visible through the network-scoped reads', () => {
    const api = createAppDataApi('analyzer')
    api.setGlobal('prefs', 1)

    expect(api.get(NET_A, 'prefs').success).toBe(false)
    const all = api.getAll(NET_A)
    expect(all.success && all.data.entries).toEqual({})
  })

  it('fails with APP11 for an absent key and succeeds on a redundant remove', () => {
    const api = createAppDataApi('analyzer')

    const result = api.getGlobal('missing')
    expect(!result.success && result.error.code).toBe(
      AppCodes.APP_DATA_NOT_FOUND.code,
    )
    expect(api.removeGlobal('missing').success).toBe(true)
  })

  it('removes a stored key', () => {
    const api = createAppDataApi('analyzer')
    api.setGlobal('prefs', 1)

    api.removeGlobal('prefs')

    expect(api.getGlobal('prefs').success).toBe(false)
  })

  it('scopes app-scoped keys by app', () => {
    createAppDataApi('app-b').setGlobal('prefs', 'b')
    expect(createAppDataApi('app-a').getGlobal('prefs').success).toBe(false)
  })
})

// ── Input validation ─────────────────────────────────────────────────────────

describe('createAppDataApi — input validation', () => {
  it('rejects a network that is not in the workspace', () => {
    const result = createAppDataApi('analyzer').set('ghost', 'k', 1)

    expect(!result.success && result.error.code).toBe(
      AppCodes.NETWORK_NOT_FOUND.code,
    )
    expect(mockAppDataActions.set).not.toHaveBeenCalled()
  })

  it('rejects an empty key', () => {
    const api = createAppDataApi('analyzer')
    expect(!api.set(NET_A, '   ', 1).success).toBe(true)
    const result = api.setGlobal('', 1)
    expect(!result.success && result.error.code).toBe(
      AppCodes.INVALID_INPUT.code,
    )
  })

  it('rejects the reserved key __proto__', () => {
    // Boot hydration assigns rows into a plain object, where that name would
    // replace the prototype instead of storing a value.
    const api = createAppDataApi('analyzer')

    const result = api.set(NET_A, '__proto__', { polluted: true })

    expect(!result.success && result.error.code).toBe(
      AppCodes.INVALID_INPUT.code,
    )
    expect(mockAppDataActions.set).not.toHaveBeenCalled()
    expect(api.setGlobal('__proto__', { polluted: true }).success).toBe(false)
  })

  it('does not report an inherited Object.prototype member as a stored value', () => {
    // `'toString' in entries` is true for every scope, so a membership test
    // with `in` returned the function itself as the stored value.
    const api = createAppDataApi('analyzer')

    for (const key of ['toString', 'constructor', '__proto__']) {
      const result = api.get(NET_A, key)
      expect(!result.success && result.error.code).toBe(
        AppCodes.APP_DATA_NOT_FOUND.code,
      )
    }
    const all = api.getAll(NET_A)
    expect(all.success && all.data.entries).toEqual({})
  })

  it('rejects undefined and points at remove()', () => {
    const result = createAppDataApi('analyzer').set(NET_A, 'k', undefined)

    expect(!result.success && result.error.code).toBe(
      AppCodes.INVALID_INPUT.code,
    )
    expect(!result.success && result.error.message).toContain('remove()')
  })

  it('rejects a cyclic value with APP12', () => {
    const cyclic: any = {}
    cyclic.self = cyclic

    const result = createAppDataApi('analyzer').set(NET_A, 'k', cyclic)

    expect(!result.success && result.error.code).toBe(
      AppCodes.APP_DATA_NOT_SERIALIZABLE.code,
    )
  })

  it('rejects a value with no JSON representation with APP12', () => {
    const result = createAppDataApi('analyzer').set(NET_A, 'k', () => 1)

    expect(!result.success && result.error.code).toBe(
      AppCodes.APP_DATA_NOT_SERIALIZABLE.code,
    )
  })

  it('rejects a value over the per-entry byte limit with APP13', () => {
    // A string of MAX+1 ASCII characters encodes to MAX+1 bytes; the two JSON
    // quotes push it further over.
    const oversized = 'x'.repeat(MAX_APP_DATA_VALUE_BYTES + 1)

    const result = createAppDataApi('analyzer').set(NET_A, 'k', oversized)

    expect(!result.success && result.error.code).toBe(
      AppCodes.APP_DATA_TOO_LARGE.code,
    )
    expect(mockAppDataActions.set).not.toHaveBeenCalled()
  })

  it('accepts a value just inside the limit', () => {
    // -2 for the JSON quotes.
    const value = 'x'.repeat(MAX_APP_DATA_VALUE_BYTES - 2)
    expect(createAppDataApi('analyzer').set(NET_A, 'k', value).success).toBe(
      true,
    )
  })

  it('returns APP3 when a store throws', () => {
    mockAppDataActions.set.mockImplementationOnce(() => {
      throw new Error('store exploded')
    })

    const result = createAppDataApi('analyzer').set(NET_A, 'k', 1)

    expect(!result.success && result.error.code).toBe(
      AppCodes.OPERATION_FAILED.code,
    )
  })
})
