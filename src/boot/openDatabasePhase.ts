import {
  clearLocalCache,
  waitingForOtherTabsMessage,
} from '@/data/db/clearLocalCache'
import {
  openDatabaseForStartup,
  type DbOpenResult,
} from '@/data/db/startupOpen'
import { logDb } from '@/debug'
import { appRootHref } from './appRootHref'
import { registerBootErrorClassifier } from './bootError'
import { BootPhase } from './bootPhases'
import { registerBootShellAction } from './shell/bootShellActions'
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

export const RESET_DATABASE_ACTION_ID = 'reset-database'

/**
 * Wires up the recovery behind the error shell's button.
 *
 * This is the same Clear Local Cache the Error page and Help › Developer offer
 * ("Clear Cache and Reload Cytoscape", src/features/Error.tsx), with the same
 * wording, through the same function: `clearLocalCache()`, which imports no
 * React, router or store code because this failure aborts the boot before
 * React mounts.
 *
 * Still gated behind arm-then-confirm: the clear is unrecoverable, and this
 * shell is too early to have the app's ConfirmationDialog available.
 *
 * Called on the failure path rather than at module scope: registering installs a
 * document-level click listener, and a boot that opens the database fine should
 * not pay for a button it will never paint.
 */
const registerResetAction = (): void => {
  registerBootShellAction(RESET_DATABASE_ACTION_ID, async ({ setStatus }) => {
    logDb.info('[openDatabasePhase] clearing the local cache on request')
    const result = await clearLocalCache({
      // Another tab holding a database open: the clear waits for it, and the
      // reader needs to know what to close.
      onWaiting: (databases) =>
        setStatus(waitingForOtherTabsMessage(databases)),
    })

    // A partial clear is not a clear. Throwing re-enables the button
    // (bootShellActions catches it) and leaves the reader on the same error
    // shell, where a retry is safe, rather than reloading into it again. The
    // status line says why, or the click would look like it did nothing.
    if (result.status === 'failed') {
      setStatus(result.reason)
      throw new Error(`local cache not cleared: ${result.reason}`)
    }

    // The boot already aborted partway through, so rerunning it from the top
    // is the honest recovery. At the app root, not the current address: a
    // share link or an `?import=` URL would load its data straight back into
    // the cache that was just cleared.
    window.location.assign(appRootHref())
  })
}

const describe = (
  result: Exclude<DbOpenResult, { kind: 'ok' }>,
): BootShellError =>
  result.kind === 'schema-too-new'
    ? {
        title: 'This browser has a newer Cytoscape Web database',
        // One sentence, and it is the instruction. There is exactly one way out
        // of this state, so explaining how the state arose (two builds on one
        // address, a switched branch, a rollback) only buries the thing to do.
        // The button below is the answer; its confirm step spells out the cost.
        message: 'Clear your local cache to continue.',
        // Not prose — the diagnostic, and the first thing anyone debugging this
        // asks for. One short line in the detail style.
        detail: `Stored version ${result.onDiskVersion ?? 'unknown'}; this build expects ${result.expectedVersion}.`,
        action: {
          id: RESET_DATABASE_ACTION_ID,
          label: 'Clear Cache and Reload Cytoscape',
          confirmLabel: 'Confirm — permanently delete',
          // The same text as the Clear Local Cache dialog: the same operation.
          confirmMessage:
            'This will permanently delete all cached networks, styles, filters, installed ' +
            'apps and settings. This action cannot be undone.',
        },
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
    // Before the throw, so the handler exists by the time the error shell is
    // painted and the reader can reach the button.
    if (result.kind === 'schema-too-new') {
      registerResetAction()
    }
    throw new DbOpenError(result)
  }
}
