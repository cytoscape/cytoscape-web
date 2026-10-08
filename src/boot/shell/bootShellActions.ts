import {
  BOOT_SHELL_ACTION_ATTR,
  BOOT_SHELL_ACTION_CONFIRM_CLASS,
  BOOT_SHELL_ARMED_CLASS,
  BOOT_SHELL_ARMED_LABEL_ATTR,
} from './bootShellMarkup'

// Click handling for the boot shell's recovery buttons.
//
// Separate from bootShellMarkup because that module is shared by both renderers
// and must stay dependency-free; separate from the phases because a phase should
// not have to know how the shell is painted.
//
// One delegated listener on `document` rather than a listener per button: the
// error shell is written as an HTML string by whichever renderer got there
// first — plain DOM via repaintBootShell(), or React via dangerouslySetInnerHTML
// — so neither can hand a button an onClick, and a repaint would drop a
// directly-attached listener. Delegation is indifferent to both.
//
// Deliberately dependency-free for the same reason as the markup: this is
// reachable before the app chunks land.

type BootShellActionHandler = () => void | Promise<void>

const handlers = new Map<string, BootShellActionHandler>()
let listening = false

/**
 * First click arms, second click runs.
 *
 * Every action offered here destroys local data irrecoverably, and the shell has
 * no MUI ConfirmationDialog available this early, so the button is its own
 * confirmation step.
 */
const arm = (button: HTMLElement): void => {
  const armedLabel = button.getAttribute(BOOT_SHELL_ARMED_LABEL_ATTR)
  if (armedLabel !== null) {
    button.textContent = armedLabel
  }
  button.classList.add(BOOT_SHELL_ARMED_CLASS)
  button.parentElement
    ?.querySelector(`.${BOOT_SHELL_ACTION_CONFIRM_CLASS}`)
    ?.removeAttribute('hidden')
}

const onClick = (event: Event): void => {
  const target = event.target
  if (!(target instanceof Element)) {
    return
  }

  const button = target.closest(`[${BOOT_SHELL_ACTION_ATTR}]`)
  if (!(button instanceof HTMLElement) || button.hasAttribute('disabled')) {
    return
  }

  const id = button.getAttribute(BOOT_SHELL_ACTION_ATTR)
  const run = id === null ? undefined : handlers.get(id)
  if (run === undefined) {
    return
  }

  if (!button.classList.contains(BOOT_SHELL_ARMED_CLASS)) {
    arm(button)
    return
  }

  // Disable before running: these actions end in a reload, and a second click
  // landing on a half-deleted database has nothing good to do.
  button.setAttribute('disabled', '')
  void (async () => {
    try {
      await run()
    } catch {
      // The shell is already in its terminal error state and the action's own
      // logging has run; re-enable so the reader can try again.
      button.removeAttribute('disabled')
    }
  })()
}

/**
 * Registers the handler for an action id declared by a `BootShellErrorAction`.
 * Safe to call at module scope — the listener is installed once, lazily.
 */
export const registerBootShellAction = (
  id: string,
  run: BootShellActionHandler,
): void => {
  handlers.set(id, run)

  if (!listening && typeof document !== 'undefined') {
    document.addEventListener('click', onClick)
    listening = true
  }
}

export const resetBootShellActionsForTesting = (): void => {
  handlers.clear()
  if (listening && typeof document !== 'undefined') {
    document.removeEventListener('click', onClick)
    listening = false
  }
}
