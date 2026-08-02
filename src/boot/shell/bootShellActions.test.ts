import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  registerBootShellAction,
  resetBootShellActionsForTesting,
} from './bootShellActions'
import { BOOT_SHELL_TESTID } from './bootShellMarkup'
import { showBootShell } from './showBootShell'

const ACTION_ID = 'reset-database'

const paintWithAction = (): HTMLButtonElement => {
  const root = document.createElement('div')
  root.id = 'root'
  document.body.appendChild(root)

  showBootShell({
    error: {
      title: 'This browser has a newer database',
      message: 'Two builds share this address.',
      action: {
        id: ACTION_ID,
        label: 'Reset Workspace and Reload Cytoscape',
        confirmLabel: 'Confirm — permanently delete',
        confirmMessage: "This permanently deletes this browser's workspace.",
      },
    },
  })

  const button = root
    .querySelector(`[data-testid="${BOOT_SHELL_TESTID}"]`)
    ?.querySelector('button')
  if (button === null || button === undefined) {
    throw new Error('the shell painted without an action button')
  }
  return button
}

afterEach(() => {
  document.body.innerHTML = ''
  resetBootShellActionsForTesting()
})

describe('boot shell recovery actions', () => {
  it('arms on the first click instead of running', () => {
    const run = vi.fn()
    registerBootShellAction(ACTION_ID, run)
    const button = paintWithAction()

    button.click()

    // The whole point of the two-step: the action destroys the local workspace
    // irrecoverably, and a mis-click must not be enough to trigger it.
    expect(run).not.toHaveBeenCalled()
    expect(button.textContent).toBe('Confirm — permanently delete')
    expect(button.classList.contains('boot-shell-error-button-armed')).toBe(
      true,
    )
    expect(
      document
        .querySelector('.boot-shell-error-action-confirm')
        ?.hasAttribute('hidden'),
    ).toBe(false)
  })

  it('runs on the second click', async () => {
    const run = vi.fn().mockResolvedValue(undefined)
    registerBootShellAction(ACTION_ID, run)
    const button = paintWithAction()

    button.click()
    button.click()

    expect(run).toHaveBeenCalledTimes(1)
    // Disabled while running: these actions end in a reload, and a third click
    // landing on a half-deleted database has nothing good to do.
    expect(button.hasAttribute('disabled')).toBe(true)

    await vi.waitFor(() => {
      expect(button.hasAttribute('disabled')).toBe(true)
    })
  })

  it('re-enables the button when the action fails', async () => {
    const run = vi.fn().mockRejectedValue(new Error('delete blocked'))
    registerBootShellAction(ACTION_ID, run)
    const button = paintWithAction()

    button.click()
    button.click()

    // Still armed, so the retry is a single click rather than two.
    await vi.waitFor(() => {
      expect(button.hasAttribute('disabled')).toBe(false)
    })
    expect(button.classList.contains('boot-shell-error-button-armed')).toBe(
      true,
    )
  })

  it('ignores clicks for an id with no registered handler', () => {
    // Register an unrelated action to attach the document-level listener.
    registerBootShellAction('some-other-id', vi.fn())
    const button = paintWithAction()

    // The click returns before arming because no handler is registered for
    // this button's action id.
    expect(() => {
      button.click()
      button.click()
    }).not.toThrow()
    expect(button.classList.contains('boot-shell-error-button-armed')).toBe(false)
  })

  it('survives a repaint of the shell', () => {
    // Delegation, not a per-button listener: the error shell is written as an
    // HTML string, so a repaint replaces the button element entirely.
    const run = vi.fn()
    registerBootShellAction(ACTION_ID, run)
    paintWithAction()
    document.body.innerHTML = ''
    const repainted = paintWithAction()

    repainted.click()
    repainted.click()

    expect(run).toHaveBeenCalledTimes(1)
  })
})
