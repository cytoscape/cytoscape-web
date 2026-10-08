import { logApp } from '../../../debug'
import { useWorkspaceStore } from './WorkspaceStore'

// Upper bound on how long to wait for workspace hydration before proceeding
// anyway. The wait normally resolves in milliseconds once AppShell calls
// setWorkspace; this only guards against a hang.
const HYDRATION_SANITY_TIMEOUT_MS = 10000

/**
 * Resolve once the workspace store is hydrated (`workspace.id !== ''`).
 *
 * Catalog composition and app restore must not run before the workspace's
 * `installedApps` are available, otherwise App Store-installed apps are
 * dropped from the merged catalog (workspace-app-install-design.md §8.3).
 *
 * Resolves immediately when already hydrated; otherwise subscribes and
 * resolves on the first non-empty id. Never rejects: if hydration exceeds a
 * sanity timeout it logs a warning and resolves anyway so app init is not
 * blocked indefinitely.
 */
export function waitForWorkspaceHydration(): Promise<void> {
  if (useWorkspaceStore.getState().workspace.id !== '') {
    return Promise.resolve()
  }

  return new Promise<void>((resolve) => {
    let settled = false

    const finish = (): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      unsubscribe()
      resolve()
    }

    const timer = setTimeout(() => {
      logApp.warn(
        '[waitForWorkspaceHydration]: workspace not hydrated within sanity timeout; proceeding anyway',
      )
      finish()
    }, HYDRATION_SANITY_TIMEOUT_MS)

    const unsubscribe = useWorkspaceStore.subscribe(
      (state) => state.workspace.id,
      (id) => {
        if (id !== '') finish()
      },
    )

    // Race guard: hydration may have completed between the initial check and
    // the subscription being installed.
    if (useWorkspaceStore.getState().workspace.id !== '') finish()
  })
}
