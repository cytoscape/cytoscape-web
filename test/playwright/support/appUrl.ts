/**
 * Single source of truth for the app's base-path URL construction, shared by
 * `playwright.config.ts` (webServer readiness probe) and the Playwright tests
 * (`page.goto` targets). Keeping it here avoids drift between the two — the app
 * is served under `urlBaseName` from config.json (e.g. "/cytoscape/"), NOT
 * always root, so both places must derive URLs the same way.
 */
import config from '../../../src/assets/config.json'

/** Local dev-server origin used by the Playwright webServer and tests. */
export const ORIGIN = 'http://localhost:5500'

/**
 * App base path derived from `urlBaseName` (e.g. "/cytoscape/" or "/"). Leading
 * and trailing slashes are normalized so callers can compose paths predictably.
 */
export const BASE_PATH = `/${String(
  (config as { urlBaseName?: string }).urlBaseName ?? '/',
).replace(/^\/+|\/+$/g, '')}`

/** Build an app-relative path under the configured base path. */
export const appPath = (path: string): string =>
  `${BASE_PATH === '/' ? '' : BASE_PATH}/${path.replace(/^\/+/, '')}`

/**
 * Absolute readiness URL for the app root under the base path. The webServer
 * probe (and `reuseExistingServer` detection) must hit a real 200, not a 404 at
 * "/", so it targets the base path rather than the origin root.
 */
export const APP_URL =
  BASE_PATH === '/' ? `${ORIGIN}/` : `${ORIGIN}${BASE_PATH}/`
