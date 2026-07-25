import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Regression tests for the concurrent-write window in cross-tab hydration.
 *
 * Hydration suppresses local IndexedDB writes so that applying a peer's change
 * does not bounce straight back out as a new change. The original
 * implementation held that suppression flag across an awaited loop of N
 * IndexedDB reads, so ANY user edit made while a hydration was in flight was
 * applied to Zustand but silently never persisted — and `persistNetworkSlices`
 * only diffs before/after of the current `set`, so the lost write was never
 * recovered either.
 *
 * The fix splits hydration into an async fetch phase and a synchronous apply
 * phase, so the flag is never held across an `await` and the window closes.
 */

const putNetworkSummaryToDb = vi.fn()
const getNetworkSummaryFromDb = vi.fn()
const getWorkspaceFromDb = vi.fn()

vi.mock('../data/db', () => ({
  getFilterFromDb: vi.fn(),
  getNetworkFromDb: vi.fn(),
  getNetworkSummaryFromDb: (...args: any[]) => getNetworkSummaryFromDb(...args),
  getNetworkViewsFromDb: vi.fn(),
  getOpaqueAspectsFromDb: vi.fn(),
  getTablesFromDb: vi.fn(),
  getUiStateFromDb: vi.fn(),
  getUndoRedoStackFromDb: vi.fn(),
  getViewSelectionFromDb: vi.fn(),
  getVisualStyleFromDb: vi.fn(),
  getWorkspaceFromDb: (...args: any[]) => getWorkspaceFromDb(...args),
  putNetworkSummaryToDb: (...args: any[]) => putNetworkSummaryToDb(...args),
  clearNetworkSummaryFromDb: vi.fn(),
  deleteNetworkSummaryFromDb: vi.fn(),
}))

import { useNetworkSummaryStore } from '../data/hooks/stores/NetworkSummaryStore'
import { hydrateFromCrossTabChange } from './crossTabHydration'

// Static imports: a dynamic import() inside a test body charges module load
// time to the 1s per-test timeout, which tips over under full-suite load.
const summaryFixture = (name: string): any => ({
  name,
  externalId: 'net-1',
  properties: [],
})

describe('cross-tab hydration: concurrent local writes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('persists a local edit made while a hydration is awaiting IndexedDB', async () => {
    // Hold the hydration read open so a user edit can land mid-flight.
    let releaseRead: (value: any) => void = () => {}
    getNetworkSummaryFromDb.mockReturnValueOnce(
      new Promise((resolve) => {
        releaseRead = resolve
      }),
    )

    const hydration = hydrateFromCrossTabChange([
      { type: 2, table: 'summaries', key: 'net-1' },
    ])

    // Let hydration reach its first await.
    await Promise.resolve()

    // The user edits something in THIS tab while that read is outstanding.
    useNetworkSummaryStore
      .getState()
      .add('net-local', summaryFixture('user edit'))

    expect(
      putNetworkSummaryToDb,
      'a local edit during hydration must still reach IndexedDB',
    ).toHaveBeenCalledWith(expect.objectContaining({ name: 'user edit' }))

    releaseRead(summaryFixture('from other tab'))
    await hydration
  })

  it('does not write back the data it just hydrated', async () => {
    getNetworkSummaryFromDb.mockResolvedValueOnce(
      summaryFixture('from other tab'),
    )

    await hydrateFromCrossTabChange([
      { type: 2, table: 'summaries', key: 'net-1' },
    ])

    expect(putNetworkSummaryToDb).not.toHaveBeenCalled()
  })

  it('reads each (table, key) once when a batch repeats it', async () => {
    getNetworkSummaryFromDb.mockResolvedValue(summaryFixture('latest'))

    await hydrateFromCrossTabChange([
      { type: 2, table: 'summaries', key: 'net-1' },
      { type: 2, table: 'summaries', key: 'net-1' },
      { type: 2, table: 'summaries', key: 'net-1' },
    ])

    expect(getNetworkSummaryFromDb).toHaveBeenCalledTimes(1)
  })
})
