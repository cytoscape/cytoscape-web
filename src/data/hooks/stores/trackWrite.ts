import { usePersistenceStatusStore } from './PersistenceStatusStore'

/**
 * Report one IndexedDB mutation to {@link usePersistenceStatusStore}.
 *
 * Puts, deletes and clears all go through here: a delete that fails leaves
 * memory and disk disagreeing just as a failed put does, and the row comes
 * back on reload.
 *
 * Returns a promise that settles the same way the wrapped one does — the
 * rejection is re-thrown — so every existing `.catch` that logs the failure
 * keeps working unchanged. Wrapping is the whole integration:
 *
 * ```ts
 * void trackWrite(putNetworkSummaryToDb(summary)).catch((e) => { ... })
 * ```
 */
export const trackWrite = async <T>(promise: Promise<T>): Promise<T> => {
  const { writeStarted, writeSettled } = usePersistenceStatusStore.getState()
  writeStarted()
  try {
    const result = await promise
    writeSettled()
    return result
  } catch (error) {
    writeSettled(error)
    throw error
  }
}
