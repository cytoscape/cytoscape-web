import {
  openDatabaseForStartup,
  type DbOpenResult,
} from '../data/db/startupOpen'
import { registerBootErrorClassifier } from './bootError'
import { BootPhase } from './bootPhases'
import type { BootShellError } from './shell/bootShellMarkup'

// The DATABASE phase: open IndexedDB explicitly, and turn a failure into
// something the reader can act on.
//
// This is the only fatal boot phase (see FATAL_BOOT_PHASES). Rendering the app
// over a dead database is not an option — AppShell's first act is to read the
// workspace from it.

/**
 * Thrown by the phase so the runner's normal failure path handles it; the
 * classifier below turns it back into the copy for the error shell.
 */
class DbOpenError extends Error {
  constructor(readonly result: Exclude<DbOpenResult, { kind: 'ok' }>) {
    super(result.kind)
    this.name = 'DbOpenError'
  }
}

const describe = (
  result: Exclude<DbOpenResult, { kind: 'ok' }>,
): BootShellError =>
  result.kind === 'schema-too-new'
    ? {
        title: 'This browser has a newer Cytoscape Web database',
        message:
          `Your browser stores a Cytoscape Web database at version ${result.onDiskVersion ?? 'unknown'}, ` +
          `but this build expects version ${result.expectedVersion}. This usually means you opened a ` +
          'newer deployment in this same browser.',
        // Instructions, not a button: clearing the database destroys the whole
        // local workspace, and a mis-click here is unrecoverable.
        detail:
          'Open the newer deployment in a different browser profile, or clear the "cyweb-db" ' +
          'database in DevTools > Application > IndexedDB to start fresh. Clearing permanently ' +
          'deletes this browser\'s local workspace.',
      }
    : {
        title: 'Cytoscape Web cannot access local storage',
        message:
          'This browser blocked access to IndexedDB, which Cytoscape Web needs to store your ' +
          'workspace. Private browsing windows commonly do this.',
        // Deliberately does NOT suggest clearing the database — that is not
        // the fix here, and saying so would send people to destroy data for
        // no reason.
        detail: `Try a normal browser window. (${result.reason})`,
      }

registerBootErrorClassifier(BootPhase.DATABASE, (cause) =>
  cause instanceof DbOpenError ? describe(cause.result) : undefined,
)

/** Opens the database, throwing on any non-ok result so the runner reports it. */
export const openDatabasePhase = async (): Promise<void> => {
  const result = await openDatabaseForStartup()
  if (result.kind !== 'ok') {
    throw new DbOpenError(result)
  }
}
