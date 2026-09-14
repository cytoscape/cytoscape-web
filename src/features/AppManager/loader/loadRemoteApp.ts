import { logApp } from '../../../debug'
import { AppLoadFailure } from '../../../models/AppModel/AppLoadFailure'
import { CyApp } from '../../../models/AppModel/CyApp'
import { loadModule } from '../ExternalComponent'

/**
 * Outcome of a remote app load. The failure branch carries which of the three
 * causes happened, so the caller can store it and the UI can name it (#719).
 */
export type LoadRemoteAppResult =
  | { readonly ok: true; readonly app: CyApp }
  | { readonly ok: false; readonly failure: AppLoadFailure }

/**
 * Load a federated remote app by injecting its remoteEntry.js script and
 * retrieving the default-exported CyApp from its `./AppConfig` module.
 *
 * On success the CyApp is added to `appRegistry` and returned as
 * `{ ok: true, app }`. On failure the cause is logged and returned as
 * `{ ok: false, failure }` — one of `no-app-config`, `id-mismatch` or
 * `fetch-failed`. Callers are expected to store the failure so it reaches the
 * user.
 *
 * This function has NO store side effects; it only interacts with the Module
 * Federation runtime and the in-memory `appRegistry` map.
 */
export async function loadRemoteApp(
  id: string,
  url: string,
  appRegistry: Map<string, CyApp>,
): Promise<LoadRemoteAppResult> {
  try {
    const remoteAppModule = await loadModule(id, './AppConfig', url)
    const remoteApp = (
      remoteAppModule as { default?: CyApp } | undefined | null
    )?.default

    if (remoteApp === undefined || remoteApp === null) {
      logApp.warn(
        `[loadRemoteApp]: Remote app "${id}" from ${url} did not expose a default AppConfig export`,
      )
      return { ok: false, failure: { code: 'no-app-config', url } }
    }

    // Strict compare on purpose: the catalog id and the bundle id are used as
    // different keys (mountedApps by bundle id, deactivateApp by catalog id),
    // so accepting a mismatched pair would leak the app's panels on unmount.
    // See "Why the strict id check stays" in #719.
    if (remoteApp.id !== id) {
      logApp.warn(
        `[loadRemoteApp]: Remote app id mismatch. Expected "${id}", received "${remoteApp.id}" from ${url}`,
      )
      return {
        ok: false,
        failure: {
          code: 'id-mismatch',
          url,
          expected: id,
          received: remoteApp.id,
        },
      }
    }

    appRegistry.set(id, remoteApp)
    return { ok: true, app: remoteApp }
  } catch (error) {
    logApp.warn(
      `[loadRemoteApp]: Failed to load remote app "${id}" from ${url}:`,
      error,
    )
    return {
      ok: false,
      failure: {
        code: 'fetch-failed',
        url,
        message: error instanceof Error ? error.message : String(error),
      },
    }
  }
}
