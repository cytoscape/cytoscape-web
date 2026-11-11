import { buildDefaultManifestUrl } from '../utils/baseUrl'

/**
 * Default manifest URL: the apps.json catalog emitted into the bundle root
 * (`appsConfigPlugin` in vite.config.ts), under the deployment's base path.
 * This URL will be updated to the App Store catalog URL when deployed.
 */
export const DEFAULT_MANIFEST_URL = buildDefaultManifestUrl(
  import.meta.env.BASE_URL,
)

export const EXTERNAL_APPS_ENABLED = true
