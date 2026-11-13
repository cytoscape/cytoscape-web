/**
 * Normalizes a URL base path to always end with a single trailing slash, so
 * config values like "/cytoscape" and "/cytoscape/" (or "") behave the same
 * when path segments are appended (e.g. the silent-check-sso.html URI).
 */
export const ensureTrailingSlash = (basePath: string): string =>
  basePath.endsWith('/') ? basePath : `${basePath}/`

/**
 * URL of the apps.json catalog this deployment serves from its own base path.
 * The app fetches it here (`DEFAULT_MANIFEST_URL`) and the dev server answers
 * it here (`appsConfigPlugin` in vite.config.ts), so the two cannot disagree.
 *
 * The base path matters: the app is not always at the origin root (dev1 serves
 * it at `/cytoscape/`), and a bare `/apps.json` there resolves to whatever the
 * origin root serves — NDEx answers 200 with an HTML page, so the catalog
 * parsed as empty and no app was listed. `base` is normalized because Vite does
 * not guarantee a trailing slash on `import.meta.env.BASE_URL` (see
 * `buildHostRemoteEntryUrl` in `federation/hostDescriptor.ts`).
 *
 * @param base Vite's resolved base (`import.meta.env.BASE_URL`, or the dev
 *   server's `config.base`)
 */
export const buildDefaultManifestUrl = (base: string): string =>
  `${ensureTrailingSlash(base)}apps.json`
