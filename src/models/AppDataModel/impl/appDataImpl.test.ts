// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { APP_DATA_GLOBAL_SCOPE } from '../AppData'
import {
  appDataRowId,
  deleteAll,
  deleteAllNetworks,
  deleteNetwork,
  fromRows,
  removeEntry,
  setEntry,
  type AppDataState,
} from './appDataImpl'

const empty = (): AppDataState => ({ appData: {} })

describe('appDataRowId', () => {
  it('encodes every segment so a key cannot forge another row id', () => {
    // Without encoding, appId 'a::n1' + networkId '' + key 'k' would collide
    // with appId 'a' + networkId 'n1' + key 'k'.
    expect(appDataRowId('a::n1', '', 'k')).not.toBe(appDataRowId('a', 'n1', 'k'))
  })

  it('is stable for the same triple', () => {
    expect(appDataRowId('app', 'net', 'key')).toBe(
      appDataRowId('app', 'net', 'key'),
    )
  })
})

describe('setEntry', () => {
  it('creates the network and app levels on first write', () => {
    const state = setEntry(empty(), 'n1', 'analyzer', 'results', [1, 2])
    expect(state.appData).toEqual({ n1: { analyzer: { results: [1, 2] } } })
  })

  it('overwrites a key without touching sibling keys or other apps', () => {
    let state = setEntry(empty(), 'n1', 'analyzer', 'a', 1)
    state = setEntry(state, 'n1', 'analyzer', 'b', 2)
    state = setEntry(state, 'n1', 'other', 'a', 3)
    state = setEntry(state, 'n1', 'analyzer', 'a', 99)

    expect(state.appData.n1).toEqual({
      analyzer: { a: 99, b: 2 },
      other: { a: 3 },
    })
  })

  it('does not mutate the state it was given', () => {
    const before = empty()
    setEntry(before, 'n1', 'analyzer', 'a', 1)
    expect(before.appData).toEqual({})
  })
})

describe('removeEntry', () => {
  it('removes one key and leaves the rest', () => {
    let state = setEntry(empty(), 'n1', 'analyzer', 'a', 1)
    state = setEntry(state, 'n1', 'analyzer', 'b', 2)

    state = removeEntry(state, 'n1', 'analyzer', 'a')

    expect(state.appData.n1.analyzer).toEqual({ b: 2 })
  })

  it('returns the same state when the key is absent', () => {
    const state = setEntry(empty(), 'n1', 'analyzer', 'a', 1)
    expect(removeEntry(state, 'n1', 'analyzer', 'missing')).toBe(state)
    expect(removeEntry(state, 'n2', 'analyzer', 'a')).toBe(state)
  })
})

describe('deleteNetwork', () => {
  it('drops every app`s entries for that network only', () => {
    let state = setEntry(empty(), 'n1', 'analyzer', 'a', 1)
    state = setEntry(state, 'n1', 'other', 'a', 2)
    state = setEntry(state, 'n2', 'analyzer', 'a', 3)

    state = deleteNetwork(state, 'n1')

    expect(state.appData).toEqual({ n2: { analyzer: { a: 3 } } })
  })

  it('returns the same state for an unknown network', () => {
    const state = empty()
    expect(deleteNetwork(state, 'nope')).toBe(state)
  })
})

describe('deleteAllNetworks', () => {
  it('keeps app-scoped entries and drops the network-scoped ones', () => {
    let state = setEntry(empty(), 'n1', 'analyzer', 'a', 1)
    state = setEntry(state, APP_DATA_GLOBAL_SCOPE, 'analyzer', 'prefs', 'dark')

    state = deleteAllNetworks(state)

    expect(state.appData).toEqual({
      [APP_DATA_GLOBAL_SCOPE]: { analyzer: { prefs: 'dark' } },
    })
  })

  it('empties the state when there are no app-scoped entries', () => {
    const state = deleteAllNetworks(setEntry(empty(), 'n1', 'a', 'k', 1))
    expect(state.appData).toEqual({})
  })
})

describe('deleteAll', () => {
  it('drops app-scoped entries too', () => {
    const state = setEntry(empty(), APP_DATA_GLOBAL_SCOPE, 'a', 'k', 1)
    expect(deleteAll(state).appData).toEqual({})
  })
})

describe('fromRows', () => {
  it('groups persisted rows by network then app', () => {
    const entries = fromRows([
      { id: '1', appId: 'analyzer', networkId: 'n1', key: 'a', value: 1 },
      { id: '2', appId: 'analyzer', networkId: 'n1', key: 'b', value: 2 },
      { id: '3', appId: 'other', networkId: 'n1', key: 'a', value: 3 },
      { id: '4', appId: 'analyzer', networkId: '', key: 'prefs', value: 4 },
    ])

    expect(entries).toEqual({
      n1: { analyzer: { a: 1, b: 2 }, other: { a: 3 } },
      '': { analyzer: { prefs: 4 } },
    })
  })

  it('returns an empty object for no rows', () => {
    expect(fromRows([])).toEqual({})
  })
})
