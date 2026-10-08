// @vitest-environment node
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

  it('flushPendingWrites awaits a write that already started on its own timer', async () => {
    // A key leaves pendingWrites the moment its timer fires, so a flush called
    // after that point used to settle while the put was still open — a test
    // reading the row straight after would get the stale value.
    let settle: () => void = () => {}
    const execute = vi.fn(
      async () =>
        await new Promise<void>((resolve) => {
          settle = resolve
        }),
    )
    scheduleWrite('store:net-1', 'store', execute)

    vi.advanceTimersByTime(WRITE_DELAY_MS + 1)
    expect(execute).toHaveBeenCalledTimes(1)
    expect(pendingWriteCount()).toBe(0)

    const order: string[] = []
    const flush = flushPendingWrites().then(() => order.push('flush'))

    // Drain every microtask the flush could settle on. It must still be
    // waiting, because the write it belongs to has not resolved.
    await vi.advanceTimersByTimeAsync(0)
    order.push('checkpoint')

    settle()
    await flush
    expect(order).toEqual(['checkpoint', 'flush'])
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
