import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  cancelWrite,
  flushPendingWrites,
  pendingWriteCount,
  scheduleWrite,
  WRITE_DELAY_MS,
} from './persistenceScheduler'

describe('persistenceScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    flushPendingWrites()
    vi.useRealTimers()
  })

  it('executes a scheduled write after the delay', () => {
    const execute = vi.fn().mockResolvedValue(undefined)
    scheduleWrite('store:net-1', 'store', execute)

    expect(execute).not.toHaveBeenCalled()
    vi.advanceTimersByTime(WRITE_DELAY_MS + 1)
    expect(execute).toHaveBeenCalledTimes(1)
    expect(pendingWriteCount()).toBe(0)
  })

  it('coalesces repeated schedules for the same key into one write of the latest callback', () => {
    const first = vi.fn().mockResolvedValue(undefined)
    const second = vi.fn().mockResolvedValue(undefined)

    scheduleWrite('store:net-1', 'store', first)
    vi.advanceTimersByTime(WRITE_DELAY_MS - 50)
    scheduleWrite('store:net-1', 'store', second)
    vi.advanceTimersByTime(WRITE_DELAY_MS + 1)

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('keeps writes for different keys independent', () => {
    const a = vi.fn().mockResolvedValue(undefined)
    const b = vi.fn().mockResolvedValue(undefined)

    scheduleWrite('store:net-a', 'store', a)
    scheduleWrite('store:net-b', 'store', b)
    vi.advanceTimersByTime(WRITE_DELAY_MS + 1)

    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('cancelWrite drops a pending write (a stale put must not resurrect a deleted row)', () => {
    const execute = vi.fn().mockResolvedValue(undefined)
    scheduleWrite('store:net-1', 'store', execute)
    cancelWrite('store:net-1')
    vi.advanceTimersByTime(WRITE_DELAY_MS + 1)

    expect(execute).not.toHaveBeenCalled()
    expect(pendingWriteCount()).toBe(0)
  })

  it('flushPendingWrites executes everything immediately', () => {
    const a = vi.fn().mockResolvedValue(undefined)
    const b = vi.fn().mockResolvedValue(undefined)
    scheduleWrite('store:net-a', 'store', a)
    scheduleWrite('store:net-b', 'store', b)

    flushPendingWrites()

    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
    expect(pendingWriteCount()).toBe(0)
  })

  it('a rejected write is contained (no unhandled rejection)', async () => {
    const execute = vi.fn().mockRejectedValue(new Error('quota exceeded'))
    scheduleWrite('store:net-1', 'store', execute)

    flushPendingWrites()
    // Drain the rejection through the internal catch
    await vi.runAllTimersAsync()

    expect(execute).toHaveBeenCalledTimes(1)
  })
})
