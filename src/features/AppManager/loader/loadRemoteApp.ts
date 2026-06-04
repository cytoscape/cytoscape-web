import { logApp } from '../../../debug'
import { loadModule } from '../ExternalComponent'
import { CyApp } from '../../../models/AppModel/CyApp'

/**
 * Load a federated remote app by injecting its remoteEntry.js script and
 * retrieving the default-exported CyApp from its `./AppConfig` module.
 *
 * On success the CyApp is added to `appRegistry` and returned.
 * On failure (network error, missing export, id mismatch) a warning is logged
 * and `undefined` is returned — callers are expected to handle the failure.
 *
 * This function has NO store side effects; it only interacts with the Module
 * Federation runtime and the in-memory `appRegistry` map.
 */
export async function loadRemoteApp(
  id: string,
  url: string,
  appRegistry: Map<string, CyApp>,
): Promise<CyApp | undefined> {
  try {
    const remoteAppModule = await loadModule(id, './AppConfig', url)
    const remoteApp = (remoteAppModule as { default?: CyApp }).default

    if (remoteApp === undefined) {
      logApp.warn(
        `[loadRemoteApp]: Remote app "${id}" from ${url} did not expose a default AppConfig export`,
      )
      return undefined
    }

    if (remoteApp.id !== id) {
      logApp.warn(
        `[loadRemoteApp]: Remote app id mismatch. Expected "${id}", received "${remoteApp.id}" from ${url}`,
      )
      return undefined
    }

    appRegistry.set(id, remoteApp)
    return remoteApp
  } catch (error) {
    logApp.warn(
      `[loadRemoteApp]: Failed to load remote app "${id}" from ${url}:`,
      error,
    )
    return undefined
  }
}
