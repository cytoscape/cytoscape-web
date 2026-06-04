import { logApp } from '../../../debug'
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
  void appRegistry
  logApp.warn(
    `[loadRemoteApp]: Ignoring external app "${id}" from ${url} because standalone mode disables remote app loading`,
  )
  return undefined
}
