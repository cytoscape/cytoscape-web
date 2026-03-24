import { logApp } from '../../../debug'
import { CyApp } from '../../../models/AppModel/CyApp'
import { loadModule } from '../ExternalComponent'

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
    const module = await loadModule(id, './AppConfig', url)
    if (module === undefined || module === null) {
      logApp.warn(
        `[loadRemoteApp]: loadModule returned ${String(module)} for app "${id}"`,
      )
      return undefined
    }

    // The remote module should default-export a CyApp object
    const cyApp: CyApp | undefined = module.default ?? module
    if (cyApp === undefined || cyApp === null) {
      logApp.warn(
        `[loadRemoteApp]: No CyApp export found for app "${id}"`,
      )
      return undefined
    }

    // Validate that the CyApp.id matches the manifest id
    if (cyApp.id !== id) {
      logApp.warn(
        `[loadRemoteApp]: CyApp.id mismatch for app "${id}": expected "${id}", got "${cyApp.id}"`,
      )
      return undefined
    }

    appRegistry.set(id, cyApp)
    return cyApp
  } catch (error) {
    logApp.warn(`[loadRemoteApp]: Failed to load app "${id}":`, error)
    return undefined
  }
}
