import { ensureTrailingSlash } from '@/utils/baseUrl'

/**
 * Which IndexedDB database a tab uses, chosen once from the URL at page load.
 *
 * The in-app manual (`/manual/*`) renders real feature components — the
 * renderer, the Style panel — on a fixture network. Every store mutation
 * persists, and cross-tab sync replays `uiState` into every other tab, so a
 * manual tab sharing `cyweb-db` would rewrite the user's open workspace
 * (#839). The manual therefore gets its own database and its own reset
 * channel; the two scopes cannot see each other.
 *
 * The scope is fixed for the life of the document. A tab that moved between
 * scopes with client-side navigation would write half its session to each
 * database, so links between the manual and the editor are full page loads.
 */
export type DbScope = 'app' | 'manual'

/** First path segment under the app's base URL that selects the manual. */
export const MANUAL_ROUTE_SEGMENT = 'manual'

export const resolveDbScope = (pathname: string, baseUrl: string): DbScope => {
  const base = ensureTrailingSlash(baseUrl)
  if (!pathname.startsWith(base)) {
    return 'app'
  }
  const rest = pathname.slice(base.length)
  return rest === MANUAL_ROUTE_SEGMENT ||
    rest.startsWith(`${MANUAL_ROUTE_SEGMENT}/`)
    ? 'manual'
    : 'app'
}

export const dbNameFor = (scope: DbScope): string =>
  scope === 'manual' ? 'cyweb-manual-db' : 'cyweb-db'

export const uiEventsChannelFor = (scope: DbScope): string =>
  scope === 'manual' ? 'cyweb-manual-ui-events' : 'cyweb-ui-events'

/**
 * The scope of this document. `import.meta.env.BASE_URL` is Vite's `base`,
 * which `vite.config.ts` sets from `config.urlBaseName`. Outside a browser
 * (node-environment tests) there is no address bar, and the scope is `app`.
 */
export const currentDbScope = (): DbScope =>
  typeof window === 'undefined'
    ? 'app'
    : resolveDbScope(window.location.pathname, import.meta.env.BASE_URL)
