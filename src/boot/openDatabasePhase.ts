import { deleteDb } from '@/data/db'
import {
  openDatabaseForStartup,
  type DbOpenResult,
} from '@/data/db/startupOpen'
import { logDb } from '@/debug'
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
 * This is the same recovery the error page offers ("Reset Workspace and Reload
 * Cytoscape", src/features/Error.tsx) — deliberately the same wording, because
 * it is the same destructive operation reached through a different door.
 *
 * That button cannot be reused directly: it is MUI plus react-router plus store
 * hooks, and this failure aborts the boot before React mounts. What is shared is
 * the primitive underneath it — deleteDb(), which the error page reaches through
 * WorkspaceStore.resetWorkspace().
 *
 * Still gated behind arm-then-confirm: destroying the local workspace is
 * unrecoverable, and this shell is too early to have the app's
 * ConfirmationDialog available.
 *
 * Called on the failure path rather than at module scope: registering installs a
 * document-level click listener, and a boot that opens the database fine should
 * not pay for a button it will never paint.
 */
const registerResetAction = (): void => {
  registerBootShellAction(RESET_DATABASE_ACTION_ID, async () => {
    logDb.info('[openDatabasePhase] resetting the local database on request')
    const outcome = await deleteDb()

    // 'delete-failed' is the only outcome that leaves the data intact and the
    // connection usable, so it is the only one worth retrying. Throwing
    // re-enables the button (bootShellActions catches it) and leaves the reader
    // on the same error shell rather than reloading into it again.
    if (outcome === 'delete-failed') {
      throw new Error(`database deletion failed: ${outcome}`)
    }

    // 'deleted', 'delete-blocked' and 'reopen-failed' all mean the data must be
    // treated as gone. Reload rather than continue: the boot already aborted
    // partway through, so rerunning it from the top is the honest recovery.
    window.location.reload()
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
        message: 'Reset your local workspace to continue.',
        // Not prose — the diagnostic, and the first thing anyone debugging this
        // asks for. One short line in the detail style.
        detail: `Stored version ${result.onDiskVersion ?? 'unknown'}; this build expects ${result.expectedVersion}.`,
        action: {
          id: RESET_DATABASE_ACTION_ID,
          label: 'Reset Workspace and Reload Cytoscape',
          confirmLabel: 'Confirm — permanently delete',
          confirmMessage:
            "This permanently deletes this browser's local workspace, including every network " +
            'in it. Networks saved to NDEx are not affected.',
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
