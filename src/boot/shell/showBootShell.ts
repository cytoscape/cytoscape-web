// Imported for its module-scope side effect: the boot URL flags must be
// snapshotted here, in the first chunk to execute, before AppShell's
// navigate() strips the search params.
import '../metrics/bootFlags'
import { markBoot } from '../metrics/bootMarks'
import {
  applyBootShellMessage,
  BOOT_SHELL_TESTID,
  bootShellClassName,
  bootShellInnerHtml,
  DEFAULT_BOOT_MESSAGE,
  ensureBootShellStyles,
  type BootShellOptions,
} from './bootShellMarkup'

const renderInto = (
  shell: HTMLElement,
  { region = 'full', message = DEFAULT_BOOT_MESSAGE, error }: BootShellOptions,
): void => {
  shell.className = bootShellClassName(region)
  shell.innerHTML = bootShellInnerHtml({ region, error })
  applyBootShellMessage(shell, message)
}

/**
 * Paints the boot shell into #root with plain DOM, before react-dom exists.
 *
 * This is needed because the generated Module Federation entry bootstrap
 * awaits the runtime's share-scope setup, which transitively downloads the
 * ~700kB shared chunk (react-dom is co-located with MUI in it) before
 * src/index.tsx ever executes. Nothing in the normal entry graph — React
 * component or otherwise — can paint sooner than that download.
 *
 * React's first commit clears #root and replaces this with `<BootShell />`,
 * which renders byte-identical DOM, so the takeover is invisible.
 */
export const showBootShell = (options: BootShellOptions = {}): void => {
  const rootElement = document.getElementById('root')

  // childElementCount guard: this is called from both the standalone shell
  // chunk (production) and src/index.tsx (dev, where the plugin that emits
  // that chunk does not run). Whichever runs second must be a no-op, and it
  // must never clobber an already-rendered app.
  if (rootElement === null || rootElement.childElementCount > 0) {
    return
  }

  ensureBootShellStyles()

  const shell = document.createElement('div')
  // Attribute order matters: outerHTML preserves insertion order, and the
  // parity test compares this against React's output, which emits className
  // before data-testid.
  shell.className = bootShellClassName(options.region ?? 'full')
  shell.setAttribute('data-testid', BOOT_SHELL_TESTID)
  renderInto(shell, options)

  rootElement.appendChild(shell)
  markBoot('shell-painted')
}

/**
 * Rewrites the already-painted plain-DOM shell in place.
 *
 * Needed for a boot that dies before React mounts — the DATABASE gate aborting
 * is the case that matters. The React BootShell subscribes to bootState and
 * repaints itself, but the plain-DOM one cannot, so it would otherwise sit
 * there spinning forever with no explanation.
 *
 * A no-op once React owns #root: by then the subscribed BootShell is handling
 * this, and reaching into React's DOM would be wrong.
 */
export const repaintBootShell = (options: BootShellOptions = {}): void => {
  const shell = document.querySelector<HTMLElement>(
    `#root > [data-testid="${BOOT_SHELL_TESTID}"]`,
  )
  if (shell === null) {
    return
  }

  renderInto(shell, options)
}
