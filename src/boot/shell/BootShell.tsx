import {
  BOOT_SHELL_TESTID,
  bootShellClassName,
  bootShellInnerHtml,
  type BootShellOptions,
} from './bootShellMarkup'

/**
 * React renderer for the boot shell — used as every Suspense fallback on the
 * boot path, and by AppShell for its content region until the workspace route
 * resolves.
 *
 * dangerouslySetInnerHTML is deliberate, not a shortcut: it renders the exact
 * same string `showBootShell()` writes, which makes the plain-DOM to React
 * handoff provably flash-free instead of relying on two hand-maintained copies
 * of the markup staying in step. The input is entirely locally-generated
 * (bootShellMarkup escapes the version, build time, message and error text),
 * so there is no untrusted content in it.
 *
 * Deliberately dependency-free (no MUI): this renders before the app chunks
 * finish loading, so importing @mui/material here would put the whole MUI +
 * Emotion bundle on the first-paint critical path.
 */
export const BootShell = ({
  region = 'full',
  message,
  error,
}: BootShellOptions): JSX.Element => (
  <div
    className={bootShellClassName(region)}
    data-testid={BOOT_SHELL_TESTID}
    dangerouslySetInnerHTML={{
      __html: bootShellInnerHtml({ region, message, error }),
    }}
  />
)
