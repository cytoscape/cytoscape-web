import {
  BOOT_SHELL_TESTID,
  bootShellClassName,
  bootShellInnerHtml,
  type BootShellOptions,
} from './bootShellMarkup'

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

  const shell = document.createElement('div')
  shell.className = bootShellClassName(options.region ?? 'full')
  shell.setAttribute('data-testid', BOOT_SHELL_TESTID)
  shell.innerHTML = bootShellInnerHtml(options)

  rootElement.appendChild(shell)
}
