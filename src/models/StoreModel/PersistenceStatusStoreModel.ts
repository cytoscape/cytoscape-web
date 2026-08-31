/**
 * What the app can currently say about writing the workspace to IndexedDB.
 *
 * `idle` is the pre-first-write state: the workspace is already on disk from an
 * earlier session, but nothing has been written since this tab loaded, so there
 * is no outcome to report yet.
 */
export type PersistenceStatus = 'idle' | 'saving' | 'saved' | 'failed'

export interface PersistenceStatusState {
  readonly status: PersistenceStatus
  /** Writes started and not yet settled. */
  readonly pending: number
  /**
   * True when a write in the burst still settling has failed. Internal to the
   * status rule below; the UI reads `status`.
   */
  readonly burstFailed: boolean
  /**
   * `Date.now()` when the current burst's first write started. Internal: the
   * store holds `saving` for a readable minimum measured from here.
   */
  readonly burstStartedAt: number
  /** `Date.now()` of the last burst that finished with every write succeeding. */
  readonly lastSavedAt?: number
  /** Message of the most recent failure. Cleared by the next clean burst. */
  readonly lastError?: string
}

export interface PersistenceStatusActions {
  /** One write has been handed to IndexedDB. */
  writeStarted: () => void
  /** That write finished. Pass the rejection value when it failed. */
  writeSettled: (error?: unknown) => void
  /** Back to `idle` with no history. For tests and a workspace reset. */
  reset: () => void
}

export type PersistenceStatusStore = PersistenceStatusState &
  PersistenceStatusActions
