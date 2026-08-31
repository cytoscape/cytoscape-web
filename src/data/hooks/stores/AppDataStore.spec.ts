import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { APP_DATA_GLOBAL_SCOPE } from '../../../models/AppDataModel'
import { appDataRowId } from '../../../models/AppDataModel/impl/appDataImpl'
import { useAppDataStore } from './AppDataStore'

const {
  clearAppDataFromDb,
  deleteAppDataFromDb,
  deleteNetworkAppDataFromDb,
  deleteNetworkScopedAppDataFromDb,
  getAllAppDataFromDb,
  putAppDataToDb,
} = vi.hoisted(() => ({
  clearAppDataFromDb: vi.fn().mockResolvedValue(undefined),
  deleteAppDataFromDb: vi.fn().mockResolvedValue(undefined),
  deleteNetworkAppDataFromDb: vi.fn().mockResolvedValue(undefined),
  deleteNetworkScopedAppDataFromDb: vi.fn().mockResolvedValue(undefined),
  getAllAppDataFromDb: vi.fn().mockResolvedValue([]),
  putAppDataToDb: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../db')>()
  return {
    ...actual,
    clearAppDataFromDb,
    deleteAppDataFromDb,
    deleteNetworkAppDataFromDb,
    deleteNetworkScopedAppDataFromDb,
    getAllAppDataFromDb,
    putAppDataToDb,
  }
})

describe('useAppDataStore', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useAppDataStore())
    act(() => {
      result.current.deleteAll()
    })
    vi.clearAllMocks()
    getAllAppDataFromDb.mockResolvedValue([])
  })

  describe('set', () => {
    it('stores a value under networkId → appId → key', () => {
      const { result } = renderHook(() => useAppDataStore())

      act(() => {
        result.current.set('n1', 'analyzer', 'results', { degree: 3 })
      })

      expect(result.current.appData).toEqual({
        n1: { analyzer: { results: { degree: 3 } } },
      })
    })

    it('persists one row per key, keyed by appDataRowId', () => {
      const { result } = renderHook(() => useAppDataStore())

      act(() => {
        result.current.set('n1', 'analyzer', 'results', [1, 2])
      })

      expect(putAppDataToDb).toHaveBeenCalledTimes(1)
      expect(putAppDataToDb).toHaveBeenCalledWith({
        id: appDataRowId('analyzer', 'n1', 'results'),
        appId: 'analyzer',
        networkId: 'n1',
        key: 'results',
        value: [1, 2],
      })
    })

    it('persists a plain object, not an Immer proxy', () => {
      const { result } = renderHook(() => useAppDataStore())

      act(() => {
        result.current.set('n1', 'analyzer', 'nested', { a: { b: [1] } })
      })

      // A proxy would not survive structured cloning into IndexedDB.
      const row = putAppDataToDb.mock.calls[0][0]
      expect(JSON.parse(JSON.stringify(row.value))).toEqual({ a: { b: [1] } })
      expect(Object.isFrozen(row.value)).toBe(false)
    })

    it('holds the value frozen, so an app must copy what it reads', () => {
      // Immer's autofreeze is never disabled, so what `appData.get()` hands an
      // app is this frozen object, not a copy. An app that mutates what it
      // read gets a TypeError. Documented on `AppDataApi.get` and in Api.md;
      // asserted here because this store is where the freeze happens.
      const { result } = renderHook(() => useAppDataStore())

      act(() => {
        result.current.set('n1', 'analyzer', 'results', { clusters: [['a']] })
      })

      const value = result.current.appData.n1.analyzer.results as {
        clusters: string[][]
      }
      expect(Object.isFrozen(value)).toBe(true)
      expect(Object.isFrozen(value.clusters[0])).toBe(true)
      expect(() => {
        value.clusters[0] = ['b']
      }).toThrow(TypeError)
    })

    it('keeps sibling keys and other apps intact', () => {
      const { result } = renderHook(() => useAppDataStore())

      act(() => {
        result.current.set('n1', 'analyzer', 'a', 1)
        result.current.set('n1', 'analyzer', 'b', 2)
        result.current.set('n1', 'other', 'a', 3)
      })

      expect(result.current.appData.n1).toEqual({
        analyzer: { a: 1, b: 2 },
        other: { a: 3 },
      })
    })
  })

  describe('remove', () => {
    it('drops the entry and its persisted row', () => {
      const { result } = renderHook(() => useAppDataStore())

      act(() => {
        result.current.set('n1', 'analyzer', 'results', 1)
        result.current.remove('n1', 'analyzer', 'results')
      })

      expect(result.current.appData.n1.analyzer).toEqual({})
      expect(deleteAppDataFromDb).toHaveBeenCalledWith(
        appDataRowId('analyzer', 'n1', 'results'),
      )
    })
  })

  describe('deleteNetwork', () => {
    it('drops every app`s entries for that network and sweeps the DB', () => {
      const { result } = renderHook(() => useAppDataStore())

      act(() => {
        result.current.set('n1', 'analyzer', 'a', 1)
        result.current.set('n1', 'other', 'a', 2)
        result.current.set('n2', 'analyzer', 'a', 3)
        result.current.deleteNetwork('n1')
      })

      expect(result.current.appData).toEqual({ n2: { analyzer: { a: 3 } } })
      expect(deleteNetworkAppDataFromDb).toHaveBeenCalledWith('n1')
    })
  })

  describe('deleteAllNetworks', () => {
    it('keeps app-scoped entries when the workspace is emptied', () => {
      const { result } = renderHook(() => useAppDataStore())

      act(() => {
        result.current.set('n1', 'analyzer', 'a', 1)
        result.current.set(APP_DATA_GLOBAL_SCOPE, 'analyzer', 'prefs', 'dark')
        result.current.deleteAllNetworks()
      })

      expect(result.current.appData).toEqual({
        [APP_DATA_GLOBAL_SCOPE]: { analyzer: { prefs: 'dark' } },
      })
      expect(deleteNetworkScopedAppDataFromDb).toHaveBeenCalledTimes(1)
    })
  })

  describe('deleteAll', () => {
    it('drops app-scoped entries too and clears the store', () => {
      const { result } = renderHook(() => useAppDataStore())

      act(() => {
        result.current.set(APP_DATA_GLOBAL_SCOPE, 'analyzer', 'prefs', 1)
        result.current.deleteAll()
      })

      expect(result.current.appData).toEqual({})
      expect(clearAppDataFromDb).toHaveBeenCalledTimes(1)
    })
  })

  describe('hydrate', () => {
    it('rebuilds the store from persisted rows', async () => {
      getAllAppDataFromDb.mockResolvedValue([
        { id: '1', appId: 'analyzer', networkId: 'n1', key: 'a', value: 1 },
        { id: '2', appId: 'other', networkId: 'n1', key: 'b', value: 2 },
        {
          id: '3',
          appId: 'analyzer',
          networkId: APP_DATA_GLOBAL_SCOPE,
          key: 'prefs',
          value: 'dark',
        },
      ])
      const { result } = renderHook(() => useAppDataStore())

      await act(async () => {
        await result.current.hydrate()
      })

      expect(result.current.appData).toEqual({
        n1: { analyzer: { a: 1 }, other: { b: 2 } },
        [APP_DATA_GLOBAL_SCOPE]: { analyzer: { prefs: 'dark' } },
      })
    })

    it('does not write the rows it just read back to the DB', async () => {
      getAllAppDataFromDb.mockResolvedValue([
        { id: '1', appId: 'analyzer', networkId: 'n1', key: 'a', value: 1 },
      ])
      const { result } = renderHook(() => useAppDataStore())

      await act(async () => {
        await result.current.hydrate()
      })

      expect(putAppDataToDb).not.toHaveBeenCalled()
    })

    it('leaves the store empty when there is nothing persisted', async () => {
      const { result } = renderHook(() => useAppDataStore())

      await act(async () => {
        await result.current.hydrate()
      })

      expect(result.current.appData).toEqual({})
    })
  })
})
