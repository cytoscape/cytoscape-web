import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getBootState,
  resetBootStateForTesting,
  setBootError,
  setBootMessage,
  subscribeBootState,
} from './bootState'

afterEach(() => {
  resetBootStateForTesting()
})

describe('bootState', () => {
  it('starts on the default message with no error', () => {
    expect(getBootState()).toEqual({ message: 'Loading application...' })
  })

  it('notifies subscribers when the message changes', () => {
    const listener = vi.fn()
    subscribeBootState(listener)

    setBootMessage('Loading workspace...')

    expect(listener).toHaveBeenCalledTimes(1)
    expect(getBootState().message).toBe('Loading workspace...')
  })

  it('keeps a stable snapshot identity when nothing changed', () => {
    // getBootState feeds useSyncExternalStore: a fresh object for a no-op
    // update would re-render React forever.
    const before = getBootState()
    const listener = vi.fn()
    subscribeBootState(listener)

    setBootMessage(before.message)

    expect(getBootState()).toBe(before)
    expect(listener).not.toHaveBeenCalled()
  })

  it('unsubscribes cleanly', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeBootState(listener)
    unsubscribe()

    setBootMessage('Loading network...')

    expect(listener).not.toHaveBeenCalled()
  })

  it('switches to the terminal error state', () => {
    setBootError({ title: 'Storage unavailable', message: 'Private browsing?' })

    expect(getBootState().error?.title).toBe('Storage unavailable')
  })

  it('does not let a later message overwrite a terminal error', () => {
    // Phases that were already in flight when the boot failed must not
    // reset the shell to a spinner.
    setBootError({ title: 'Storage unavailable', message: 'Private browsing?' })
    setBootMessage('Loading network...')

    expect(getBootState().error?.title).toBe('Storage unavailable')
    expect(getBootState().message).toBe('Loading application...')
  })
})
