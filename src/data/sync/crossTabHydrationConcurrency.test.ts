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

const putNetworkSummaryToDb = vi.fn().mockResolvedValue(undefined)
const getNetworkSummaryFromDb = vi.fn()
const getWorkspaceFromDb = vi.fn()
const getUiStateFromDb = vi.fn()

// Writes resolve rather than returning undefined: production code chains
// `.catch()` onto them. Deliberately not derived via `importOriginal` — that
// loads Dexie, which costs more than the 1s per-test timeout allows.
vi.mock('@/data/db', () => ({
  getFilterFromDb: vi.fn(),
  getNetworkFromDb: vi.fn(),
  getNetworkSummaryFromDb: (...args: any[]) => getNetworkSummaryFromDb(...args),
  getNetworkViewsFromDb: vi.fn(),
  getOpaqueAspectsFromDb: vi.fn(),
  getTablesFromDb: vi.fn(),
  getUiStateFromDb: (...args: any[]) => getUiStateFromDb(...args),
  getUndoRedoStackFromDb: vi.fn(),
  getViewSelectionFromDb: vi.fn(),
  getVisualStyleSetFromDb: vi.fn(),
  getWorkspaceFromDb: (...args: any[]) => getWorkspaceFromDb(...args),
  putNetworkSummaryToDb: (...args: any[]) => putNetworkSummaryToDb(...args),
  putUiStateToDb: vi.fn().mockResolvedValue(undefined),
  putWorkspaceToDb: vi.fn().mockResolvedValue(undefined),
  clearNetworkSummaryFromDb: vi.fn().mockResolvedValue(undefined),
  deleteNetworkSummaryFromDb: vi.fn().mockResolvedValue(undefined),
}))

import { useNetworkSummaryStore } from '@/data/hooks/stores/NetworkSummaryStore'
import { useUiStateStore } from '@/data/hooks/stores/UiStateStore'
import { useWorkspaceStore } from '@/data/hooks/stores/WorkspaceStore'
import {
  hydrateFromCrossTabChange,
  HYDRATION_BATCH_TIMEOUT_MS,
} from '@/data/sync/crossTabHydration'

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

  /**
   * Two batches used to overlap in their async fetch phases. Every
   * `prepareChange` re-reads the row's current value rather than applying the
   * change's delta, so the batch that started earlier holds the staler read — and
   * if it also contains a slow row it finishes last and overwrites the newer
   * value. Nothing corrects that afterwards, so the tab keeps serving a value
   * IndexedDB no longer holds until the next change to the same row.
   */
  it('applies overlapping batches in arrival order', async () => {
    let releaseFirstRead: (value: any) => void = () => {}
    getNetworkSummaryFromDb
      // Batch 1's read: held open, and it read the older value.
      .mockReturnValueOnce(
        new Promise((resolve) => {
          releaseFirstRead = resolve
        }),
      )
      // Batch 2's read: resolves immediately, with the newer value.
      .mockResolvedValueOnce(summaryFixture('second'))

    const first = hydrateFromCrossTabChange([
      { type: 2, table: 'summaries', key: 'net-1' },
    ])
    await Promise.resolve()

    const second = hydrateFromCrossTabChange([
      { type: 2, table: 'summaries', key: 'net-1' },
    ])

    releaseFirstRead(summaryFixture('first'))
    await Promise.all([first, second])

    expect(
      useNetworkSummaryStore.getState().summaries['net-1'].name,
      'the later batch must win, whatever order the reads resolved in',
    ).toBe('second')
  })

  /**
   * The queue is only an improvement if one stuck batch cannot stop every later
   * one: without a bound, a read that never settles would silently end cross-tab
   * sync for the lifetime of the page.
   */
  it('gives up on a batch that never finishes, and drops its late apply', async () => {
    vi.useFakeTimers()
    try {
      let releaseWedged: (value: any) => void = () => {}
      getNetworkSummaryFromDb
        .mockReturnValueOnce(
          new Promise((resolve) => {
            releaseWedged = resolve
          }),
        )
        .mockResolvedValueOnce(summaryFixture('after the wedge'))

      const wedged = hydrateFromCrossTabChange([
        { type: 2, table: 'summaries', key: 'net-1' },
      ])
      const next = hydrateFromCrossTabChange([
        { type: 2, table: 'summaries', key: 'net-1' },
      ])

      await vi.advanceTimersByTimeAsync(HYDRATION_BATCH_TIMEOUT_MS + 1)
      await wedged
      await next

      expect(
        useNetworkSummaryStore.getState().summaries['net-1'].name,
        'the batch behind the wedged one must still hydrate',
      ).toBe('after the wedge')

      // The abandoned batch's read finally lands. It must not resurrect the value
      // the batch behind it already superseded.
      releaseWedged(summaryFixture('stale, from the wedged batch'))
      await vi.advanceTimersByTimeAsync(1)

      expect(useNetworkSummaryStore.getState().summaries['net-1'].name).toBe(
        'after the wedge',
      )
    } finally {
      vi.useRealTimers()
    }
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

  it('applies workspace before uiState however the batch is ordered', async () => {
    // Dedupe keeps a row at its FIRST insertion position, so revision order
    // alone would apply uiState first here — and uiState hydration reads
    // `workspace.networkIds` to decide whether this tab's activeNetworkView
    // still exists.
    useWorkspaceStore.getState().set({
      ...useWorkspaceStore.getState().workspace,
      networkIds: [],
    })
    useUiStateStore.getState().setActiveNetworkView('net-9')

    getWorkspaceFromDb.mockResolvedValue({
      id: 'ws-1',
      name: 'ws',
      networkIds: ['net-9'],
      currentNetworkId: '',
      networkModified: {},
      creationTime: 0,
      localModificationTime: 0,
    })
    getUiStateFromDb.mockResolvedValue({
      visualStyleOptions: {},
      customNetworkTabName: {},
      tableUi: { columnUiState: {} },
    })

    await hydrateFromCrossTabChange([
      { type: 2, table: 'uiState', key: 'uistate' },
      { type: 2, table: 'workspace', key: 'ws-1' },
      { type: 2, table: 'uiState', key: 'uistate' },
    ])

    // Cleared only if uiState ran against the pre-hydration (empty) networkIds.
    expect(useUiStateStore.getState().ui.activeNetworkView).toBe('net-9')
  })
})
