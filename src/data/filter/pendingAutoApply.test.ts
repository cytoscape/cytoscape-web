// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  cancelAutoApply,
  hasPendingAutoApply,
  scheduleAutoApply,
} from './pendingAutoApply'

describe('pendingAutoApply', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cancelAutoApply('a')
    cancelAutoApply('b')
    vi.useRealTimers()
  })

  it('runs once after the delay, then has nothing pending', () => {
    const run = vi.fn()
    scheduleAutoApply('a', run, 300)
    expect(hasPendingAutoApply('a')).toBe(true)

    vi.advanceTimersByTime(299)
    expect(run).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(run).toHaveBeenCalledTimes(1)
    expect(hasPendingAutoApply('a')).toBe(false)

    vi.advanceTimersByTime(1000)
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('replaces the pending run of the same network', () => {
    const first = vi.fn()
    const second = vi.fn()
    scheduleAutoApply('a', first, 300)
    vi.advanceTimersByTime(200)
    scheduleAutoApply('a', second, 300)
    vi.advanceTimersByTime(200)
    expect(first).not.toHaveBeenCalled()
    expect(second).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('cancels only the given network', () => {
    const runA = vi.fn()
    const runB = vi.fn()
    scheduleAutoApply('a', runA, 300)
    scheduleAutoApply('b', runB, 300)

    cancelAutoApply('a')
    vi.advanceTimersByTime(300)

    expect(runA).not.toHaveBeenCalled()
    expect(runB).toHaveBeenCalledTimes(1)
    expect(hasPendingAutoApply('a')).toBe(false)
  })

  it('cancels nothing when nothing is pending', () => {
    expect(() => cancelAutoApply('a')).not.toThrow()
    expect(hasPendingAutoApply('a')).toBe(false)
  })
})
