import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import type { RegisteredContextMenuItem } from '../../../models/StoreModel/ContextMenuItemStoreModel'
import { cleanupAllForApp } from './AppCleanupRegistry'
import { useContextMenuItemStore } from './ContextMenuItemStore'

const makeItem = (
  itemId: string,
  appId?: string,
): RegisteredContextMenuItem => ({
  itemId,
  appId,
  label: `label-${itemId}`,
  handler: () => {},
})

describe('ContextMenuItemStore', () => {
  beforeEach(() => {
    act(() => {
      useContextMenuItemStore.setState({ items: [] })
    })
  })

  it('addItem appends registered items in order', () => {
    const { result } = renderHook(() => useContextMenuItemStore())

    act(() => {
      result.current.addItem(makeItem('i1', 'app-a'))
      result.current.addItem(makeItem('i2', 'app-b'))
    })

    expect(result.current.items.map((i) => i.itemId)).toEqual(['i1', 'i2'])
  })

  it('removeItem removes only the matching itemId', () => {
    const { result } = renderHook(() => useContextMenuItemStore())

    act(() => {
      result.current.addItem(makeItem('i1', 'app-a'))
      result.current.addItem(makeItem('i2', 'app-a'))
      result.current.removeItem('i1')
    })

    expect(result.current.items.map((i) => i.itemId)).toEqual(['i2'])
  })

  it('removeItem with an unknown id leaves the items untouched', () => {
    const { result } = renderHook(() => useContextMenuItemStore())

    act(() => {
      result.current.addItem(makeItem('i1', 'app-a'))
      result.current.removeItem('nope')
    })

    expect(result.current.items.map((i) => i.itemId)).toEqual(['i1'])
  })

  it('removeAllByAppId removes that app’s items but never anonymous ones', () => {
    const { result } = renderHook(() => useContextMenuItemStore())

    act(() => {
      result.current.addItem(makeItem('a1', 'app-a'))
      result.current.addItem(makeItem('anon', undefined))
      result.current.addItem(makeItem('b1', 'app-b'))
      result.current.addItem(makeItem('a2', 'app-a'))
      result.current.removeAllByAppId('app-a')
    })

    expect(result.current.items.map((i) => i.itemId)).toEqual(['anon', 'b1'])
  })

  // The store registers itself with the AppCleanupRegistry at module load,
  // so appLifecycle's single cleanup entry point must clear its items too.
  it('cleanupAllForApp (app lifecycle) removes the unmounted app’s items', () => {
    const { result } = renderHook(() => useContextMenuItemStore())

    act(() => {
      result.current.addItem(makeItem('a1', 'app-a'))
      result.current.addItem(makeItem('anon', undefined))
      cleanupAllForApp('app-a')
    })

    expect(result.current.items.map((i) => i.itemId)).toEqual(['anon'])
  })
})
