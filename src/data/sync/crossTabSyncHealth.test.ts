// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  CONSECUTIVE_BATCH_FAILURE_THRESHOLD,
  onCrossTabSyncFailed,
  reportHydrationBatchFailure,
  reportHydrationBatchSuccess,
  reportSyncListenerFailure,
  resetCrossTabSyncHealthForTesting,
} from '@/data/sync/crossTabSyncHealth'

/**
 * The threshold exists so a single bad row does not put a warning in front of
 * the user, while a tab that has genuinely stopped syncing does not stay
 * silent. Both halves of that are worth pinning.
 */
describe('crossTabSyncHealth', () => {
  beforeEach(() => {
    resetCrossTabSyncHealthForTesting()
  })

  const failTimes = (n: number): void => {
    for (let i = 0; i < n; i += 1) {
      reportHydrationBatchFailure()
    }
  }

  it('reports a listener failure immediately', () => {
    const listener = vi.fn()
    onCrossTabSyncFailed(listener)

    reportSyncListenerFailure()

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith('listener')
  })

  it('stays quiet below the batch-failure threshold', () => {
    const listener = vi.fn()
    onCrossTabSyncFailed(listener)

    failTimes(CONSECUTIVE_BATCH_FAILURE_THRESHOLD - 1)

    expect(listener).not.toHaveBeenCalled()
  })

  it('reports once the threshold is reached', () => {
    const listener = vi.fn()
    onCrossTabSyncFailed(listener)

    failTimes(CONSECUTIVE_BATCH_FAILURE_THRESHOLD)

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith('hydration')
  })

  it('does not repeat while the tab stays broken', () => {
    const listener = vi.fn()
    onCrossTabSyncFailed(listener)

    // A wholly broken tab fails every batch. Emitting on each would put a new
    // warning in front of the user every few hundred milliseconds.
    failTimes(CONSECUTIVE_BATCH_FAILURE_THRESHOLD + 10)

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('forgets a streak that a success interrupts', () => {
    const listener = vi.fn()
    onCrossTabSyncFailed(listener)

    failTimes(CONSECUTIVE_BATCH_FAILURE_THRESHOLD - 1)
    reportHydrationBatchSuccess()
    failTimes(CONSECUTIVE_BATCH_FAILURE_THRESHOLD - 1)

    // Sync stumbled twice but recovered in between, so there is nothing to
    // tell the user about.
    expect(listener).not.toHaveBeenCalled()
  })

  it('reports a second episode after a recovery', () => {
    const listener = vi.fn()
    onCrossTabSyncFailed(listener)

    failTimes(CONSECUTIVE_BATCH_FAILURE_THRESHOLD)
    reportHydrationBatchSuccess()
    failTimes(CONSECUTIVE_BATCH_FAILURE_THRESHOLD)

    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('stops calling a listener that unsubscribed', () => {
    const listener = vi.fn()
    const unsubscribe = onCrossTabSyncFailed(listener)

    unsubscribe()
    reportSyncListenerFailure()

    expect(listener).not.toHaveBeenCalled()
  })

  it('keeps calling later listeners when one throws', () => {
    const thrower = vi.fn(() => {
      throw new Error('listener blew up')
    })
    const listener = vi.fn()
    onCrossTabSyncFailed(thrower)
    onCrossTabSyncFailed(listener)

    expect(() => reportSyncListenerFailure()).not.toThrow()
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
