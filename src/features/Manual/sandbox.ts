import { clearSandboxDb } from '@/data/db'
import { currentDbScope } from '@/data/db/dbScope'
import { logUi } from '@/debug'

let ready: Promise<boolean> | undefined

/**
 * Resolves true when live demos may run: the tab is in the manual scope. It
 * first tries, once per document, to empty the sandbox database so old demo
 * rows do not pile up.
 *
 * Resolves false outside the manual scope. Live demos must not render then:
 * their writes would land in the user's workspace.
 *
 * A failed clear still resolves true. Leftover rows sit in the sandbox, which
 * nothing reads back, so they cost disk space only; refusing the demo would
 * cost the reader the page's working example.
 */
export const sandboxReady = (): Promise<boolean> => {
  if (ready === undefined) {
    ready =
      currentDbScope() !== 'manual'
        ? Promise.resolve(false)
        : clearSandboxDb().catch((cause: unknown) => {
            logUi.warn('[Manual] could not clear the sandbox database', cause)
            return true
          })
  }
  return ready
}
