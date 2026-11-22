import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  CYWEB_SESSION_STORAGE_KEYS,
  onCywebSessionStorageRemoved,
  removeCywebSessionStorage,
} from './browserStorageInventory'

describe('removeCywebSessionStorage', () => {
  let unsubscribe: (() => void) | undefined

  afterEach(() => {
    unsubscribe?.()
    unsubscribe = undefined
    sessionStorage.clear()
  })

  it('removes every key and tells the listeners afterwards', () => {
    CYWEB_SESSION_STORAGE_KEYS.forEach((key) =>
      sessionStorage.setItem(key, 'x'),
    )
    const listener = vi.fn(() => {
      // Listeners run after the keys are gone.
      expect(
        CYWEB_SESSION_STORAGE_KEYS.map((key) => sessionStorage.getItem(key)),
      ).toEqual(CYWEB_SESSION_STORAGE_KEYS.map(() => null))
    })
    unsubscribe = onCywebSessionStorageRemoved(listener)

    expect(removeCywebSessionStorage()).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('does not tell the listeners when storage cannot be written', () => {
    const listener = vi.fn()
    unsubscribe = onCywebSessionStorageRemoved(listener)
    const broken = {
      removeItem: () => {
        throw new Error('blocked')
      },
    } as unknown as Storage

    expect(removeCywebSessionStorage(broken)).toBe(false)
    expect(listener).not.toHaveBeenCalled()
  })

  it('stops telling a listener once it unsubscribes', () => {
    const listener = vi.fn()
    onCywebSessionStorageRemoved(listener)()

    removeCywebSessionStorage()
    expect(listener).not.toHaveBeenCalled()
  })

  it('still removes the keys when a listener throws', () => {
    sessionStorage.setItem(CYWEB_SESSION_STORAGE_KEYS[0], 'x')
    const after = vi.fn()
    const first = onCywebSessionStorageRemoved(() => {
      throw new Error('listener bug')
    })
    unsubscribe = onCywebSessionStorageRemoved(after)

    expect(removeCywebSessionStorage()).toBe(true)
    expect(sessionStorage.getItem(CYWEB_SESSION_STORAGE_KEYS[0])).toBeNull()
    expect(after).toHaveBeenCalledTimes(1)
    first()
  })
})
