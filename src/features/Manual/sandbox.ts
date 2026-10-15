import { clearSandboxDb } from '@/data/db'
import { currentDbScope } from '@/data/db/dbScope'
import { logUi } from '@/debug'

let ready: Promise<boolean> | undefined

/**
 * Resolves true once the manual's sandbox database is empty, so every visit
 * starts from the fixture state. Runs once per document.
 *
 * Resolves false outside the manual scope. Live demos must not render then:
 * their writes would land in the user's workspace.
 */
export const sandboxReady = (): Promise<boolean> => {
  if (ready === undefined) {
    ready =
      currentDbScope() !== 'manual'
        ? Promise.resolve(false)
        : clearSandboxDb().catch((cause: unknown) => {
            // A failed clear leaves old demo rows behind. The manual never
            // reads them back, so the demos stay safe to run.
            logUi.warn('[Manual] could not clear the sandbox database', cause)
            return true
          })
  }
  return ready
}
