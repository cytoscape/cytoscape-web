import { useLayoutEffect, useMemo, useRef } from 'react'

import {
  applyBootShellMessage,
  BOOT_SHELL_TESTID,
  bootShellClassName,
  bootShellInnerHtml,
  ensureBootShellStyles,
  type BootShellOptions,
} from './bootShellMarkup'
import { useBootState } from './useBootState'

/**
 * React renderer for the boot shell — used as every Suspense fallback on the
 * boot path, and by AppShell for its content region until the workspace route
 * resolves.
 *
 * With no `message` prop it tracks the live boot phase, so the status line
 * updates in place as the boot progresses instead of each boundary hard-coding
 * its own wording. Pass `message` to pin it.
 *
 * dangerouslySetInnerHTML is deliberate, not a shortcut: it renders the exact
 * same string `showBootShell()` writes, which makes the plain-DOM to React
 * handoff provably flash-free instead of relying on two hand-maintained copies
 * of the markup staying in step. The input is entirely locally-generated
 * (bootShellMarkup escapes the build metadata and error text), so there is no
 * untrusted content in it.
 *
 * The message is applied through a ref rather than interpolated into that
 * string, so the string only changes when `region` or the error does. If the
 * message were part of it, every phase transition would hand React a new
 * string, and React would replace the whole subtree — recreating every shimmer
 * block and the spinner, and restarting their animations from frame zero.
 * That was a visible flicker three times per boot.
 *
 * Deliberately dependency-free (no MUI): this renders before the app chunks
 * finish loading, so importing @mui/material here would put the whole MUI +
 * Emotion bundle on the first-paint critical path.
 */
export const BootShell = ({
  region = 'full',
  message,
  error,
}: BootShellOptions): JSX.Element => {
  const bootState = useBootState()
  const shellRef = useRef<HTMLDivElement>(null)

  const activeError = error ?? bootState.error
  const activeMessage = message ?? bootState.message

  // Stable across message changes; React skips the DOM write when the string
  // is unchanged, which is the whole point.
  const html = useMemo(
    () => bootShellInnerHtml({ region, error: activeError }),
    [region, activeError],
  )

  // Layout effect, not effect: runs after the DOM mutation but before the
  // browser paints, so the status line is never briefly blank.
  useLayoutEffect(() => {
    ensureBootShellStyles()
    if (shellRef.current !== null) {
      applyBootShellMessage(shellRef.current, activeMessage)
    }
  }, [html, activeMessage])

  return (
    <div
      ref={shellRef}
      className={bootShellClassName(region)}
      data-testid={BOOT_SHELL_TESTID}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
