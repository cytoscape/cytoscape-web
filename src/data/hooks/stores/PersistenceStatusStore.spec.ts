// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  MIN_SAVING_MS,
  usePersistenceStatusStore,
} from './PersistenceStatusStore'
import { trackWrite } from './trackWrite'

const statusOf = () => usePersistenceStatusStore.getState().status

describe('PersistenceStatusStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    usePersistenceStatusStore.getState().reset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  /** Settle the hold that keeps a clean burst reading `saving`. */
  const runOutHold = (): void => {
    vi.advanceTimersByTime(MIN_SAVING_MS)
  }

  it('starts idle, with nothing to report yet', () => {
    const state = usePersistenceStatusStore.getState()
    expect(state.status).toBe('idle')
    expect(state.pending).toBe(0)
    expect(state.lastSavedAt).toBeUndefined()
    expect(state.lastError).toBeUndefined()
  })

  it('reports saving while a write is in flight, then saved', () => {
    const { writeStarted, writeSettled } = usePersistenceStatusStore.getState()

    writeStarted()
    expect(statusOf()).toBe('saving')

    writeSettled()
    // Held at 'saving' so the state is readable, but the save is already
    // recorded.
    expect(statusOf()).toBe('saving')
    expect(usePersistenceStatusStore.getState().lastSavedAt).toBeTypeOf(
      'number',
    )

    runOutHold()
    expect(statusOf()).toBe('saved')
  })

  it('stays saving until the last write of a burst settles', () => {
    const { writeStarted, writeSettled } = usePersistenceStatusStore.getState()

    writeStarted()
    writeStarted()
    writeSettled()
    expect(statusOf()).toBe('saving')
    expect(usePersistenceStatusStore.getState().pending).toBe(1)

    writeSettled()
    runOutHold()
    expect(statusOf()).toBe('saved')
  })

  it('reports failed when any write in the burst failed', () => {
    const { writeStarted, writeSettled } = usePersistenceStatusStore.getState()

    writeStarted()
    writeStarted()
    writeSettled(new Error('quota exceeded'))
    // The sibling write still succeeds, but the burst is already tainted.
    writeSettled()

    expect(statusOf()).toBe('failed')
    expect(usePersistenceStatusStore.getState().lastError).toBe(
      'quota exceeded',
    )
    expect(usePersistenceStatusStore.getState().lastSavedAt).toBeUndefined()
  })

  it('keeps a failure visible until a later burst completes cleanly', () => {
    const { writeStarted, writeSettled } = usePersistenceStatusStore.getState()

    writeStarted()
    writeSettled(new Error('disk full'))
    expect(statusOf()).toBe('failed')

    writeStarted()
    writeSettled()
    runOutHold()
    expect(statusOf()).toBe('saved')
    expect(usePersistenceStatusStore.getState().lastError).toBeUndefined()
  })

  it('clamps a settle that has no matching start', () => {
    // A negative counter would leave the status stuck on 'saving' forever.
    usePersistenceStatusStore.getState().writeSettled()
    expect(usePersistenceStatusStore.getState().pending).toBe(0)
    expect(statusOf()).toBe('saved')
  })

  it('keeps reporting saving when a write starts during the hold', () => {
    const { writeStarted, writeSettled } = usePersistenceStatusStore.getState()

    writeStarted()
    writeSettled()
    expect(statusOf()).toBe('saving')

    // A second burst begins before the first one's hold expires; the expiring
    // timer must not report 'saved' over a write that is still open.
    writeStarted()
    runOutHold()
    expect(statusOf()).toBe('saving')

    writeSettled()
    runOutHold()
    expect(statusOf()).toBe('saved')
  })

  it('drops the hold when the burst failed', () => {
    const { writeStarted, writeSettled } = usePersistenceStatusStore.getState()

    writeStarted()
    writeSettled(new Error('quota exceeded'))
    // No hold: a failure is reported the moment it is known.
    expect(statusOf()).toBe('failed')

    runOutHold()
    expect(statusOf()).toBe('failed')
  })

  it('stringifies a non-Error rejection', () => {
    const { writeStarted, writeSettled } = usePersistenceStatusStore.getState()
    writeStarted()
    writeSettled('InvalidStateError')
    expect(usePersistenceStatusStore.getState().lastError).toBe(
      'InvalidStateError',
    )
  })
})

describe('trackWrite', () => {
  beforeEach(() => {
    usePersistenceStatusStore.getState().reset()
  })

  it('resolves to the wrapped value and records the save', async () => {
    const result = await trackWrite(Promise.resolve('written'))

    expect(result).toBe('written')
    // Real timers here, so the status is still inside its readable hold.
    expect(statusOf()).toBe('saving')
    expect(usePersistenceStatusStore.getState().lastSavedAt).toBeTypeOf(
      'number',
    )
  })

  it('re-throws so the caller keeps its own error handling', async () => {
    const onError = vi.fn()

    await trackWrite(Promise.reject(new Error('boom'))).catch(onError)

    expect(onError).toHaveBeenCalledTimes(1)
    expect(statusOf()).toBe('failed')
    expect(usePersistenceStatusStore.getState().lastError).toBe('boom')
  })
})
