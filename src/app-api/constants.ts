import { ensureTrailingSlash } from '../utils/baseUrl'

/**
 * URL of the apps.json catalog this deployment serves from its own base path.
 *
 * The base path matters: the app is not always at the origin root (dev1 serves
 * it at `/cytoscape/`), and a bare `/apps.json` there resolves to whatever the
 * origin root serves — NDEx answers 200 with an HTML page, so the catalog
 * parsed as empty and no app was listed. `base` is normalized because Vite does
 * not guarantee a trailing slash on `import.meta.env.BASE_URL` (see
 * `buildHostRemoteEntryUrl` in `federation/hostDescriptor.ts`).
 *
 * @param base Vite's resolved base (`import.meta.env.BASE_URL`)
 */
export const buildDefaultManifestUrl = (base: string): string =>
  `${ensureTrailingSlash(base)}apps.json`

/**
 * Default manifest URL: the apps.json catalog emitted into the bundle root
 * (`appsConfigPlugin` in vite.config.ts), under the deployment's base path.
 * This URL will be updated to the App Store catalog URL when deployed.
 */
export const DEFAULT_MANIFEST_URL = buildDefaultManifestUrl(
  import.meta.env.BASE_URL,
)

export const EXTERNAL_APPS_ENABLED = true
