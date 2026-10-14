import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { classifyBootError } from './bootError'
import { BootPhase } from './bootPhases'
import { resetBootShellActionsForTesting } from './shell/bootShellActions'
import { BOOT_SHELL_TESTID } from './shell/bootShellMarkup'
import { showBootShell } from './shell/showBootShell'

const openDatabaseForStartup = vi.fn()
const deleteDb = vi.fn()

vi.mock('../data/db/startupOpen', () => ({
  openDatabaseForStartup: () => openDatabaseForStartup(),
}))

vi.mock('../data/db', () => ({
  deleteDb: () => deleteDb(),
}))

// Importing the module registers the phase's error classifier as a side effect,
// so it has to happen after the mocks above are in place.
const { openDatabasePhase, RESET_DATABASE_ACTION_ID } = await import(
  './openDatabasePhase'
)

const reload = vi.fn()

beforeEach(() => {
  openDatabaseForStartup.mockReset()
  deleteDb.mockReset().mockResolvedValue('deleted')
  reload.mockReset()
  // jsdom's location.reload is not writable; replacing the whole descriptor is.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, reload },
  })
})

afterEach(() => {
  document.body.innerHTML = ''
  resetBootShellActionsForTesting()
})

/** Paints the error shell the way bootstrap.tsx does on a fatal DB failure. */
const paintErrorShell = (cause: unknown): HTMLButtonElement | null => {
  const root = document.createElement('div')
  root.id = 'root'
  document.body.appendChild(root)

  showBootShell({ error: classifyBootError(BootPhase.DATABASE, cause) })

  return (
    root
      .querySelector(`[data-testid="${BOOT_SHELL_TESTID}"]`)
      ?.querySelector('button') ?? null
  )
}

const failWith = async (result: Record<string, unknown>): Promise<unknown> => {
  openDatabaseForStartup.mockResolvedValue(result)
  try {
    await openDatabasePhase()
  } catch (cause) {
    return cause
  }
  throw new Error('openDatabasePhase resolved instead of throwing')
}

describe('openDatabasePhase database reset action', () => {
  it('resolves quietly when the database opens', async () => {
    openDatabaseForStartup.mockResolvedValue({ kind: 'ok' })

    await expect(openDatabasePhase()).resolves.toBeUndefined()
  })

  it('offers the reset button on a schema-too-new failure', async () => {
    const cause = await failWith({
      kind: 'schema-too-new',
      onDiskVersion: 12,
      expectedVersion: 10,
    })

    const button = paintErrorShell(cause)
    expect(button?.getAttribute('data-boot-action')).toBe(
      RESET_DATABASE_ACTION_ID,
    )
    expect(button?.textContent).toBe('Reset Workspace and Reload Cytoscape')
  })

  it('states the one thing to do, and keeps the versions as the detail', async () => {
    // Deliberately terse. There is exactly one way out of this state, so
    // narrating how it arose (two builds on one address, a switched branch, a
    // rollback) would only bury the instruction. The versions stay because they
    // are the first thing anyone debugging this asks for.
    const cause = await failWith({
      kind: 'schema-too-new',
      onDiskVersion: 12,
      expectedVersion: 10,
    })

    const error = classifyBootError(BootPhase.DATABASE, cause)

    expect(error.message).toBe('Reset your local workspace to continue.')
    expect(error.detail).toBe('Stored version 12; this build expects 10.')
  })

  it('reports an unknown on-disk version without printing undefined', async () => {
    const cause = await failWith({
      kind: 'schema-too-new',
      expectedVersion: 10,
    })

    const error = classifyBootError(BootPhase.DATABASE, cause)

    expect(error.detail).toBe('Stored version unknown; this build expects 10.')
  })

  it('deletes the database and reloads only after the confirm click', async () => {
    const cause = await failWith({
      kind: 'schema-too-new',
      onDiskVersion: 12,
      expectedVersion: 10,
    })
    const button = paintErrorShell(cause)

    button?.click()
    expect(deleteDb).not.toHaveBeenCalled()

    button?.click()
    await vi.waitFor(() => {
      expect(deleteDb).toHaveBeenCalledTimes(1)
    })
    // Same primitive the error page's "Reset Workspace" button reaches through
    // WorkspaceStore.resetWorkspace().
    await vi.waitFor(() => {
      expect(reload).toHaveBeenCalledTimes(1)
    })
  })

  it('offers no button when IndexedDB is merely unavailable', async () => {
    const cause = await failWith({
      kind: 'unavailable',
      reason: 'InvalidStateError',
    })

    // Clearing the database is not the fix for private browsing, and offering
    // it would send people to destroy data for no reason.
    expect(paintErrorShell(cause)).toBeNull()
    expect(deleteDb).not.toHaveBeenCalled()
  })
})

// Deliberately no resetBootErrorClassifiersForTesting() here: this phase
// registers its classifier as an import-time side effect, so clearing it
// between tests would leave every later test with the generic error and no
// action button.
