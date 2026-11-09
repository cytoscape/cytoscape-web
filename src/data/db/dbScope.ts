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
 * The embed (`/embed/*`) shows one network inside a third-party iframe. Its
 * database is held in memory (`fake-indexeddb`), so nothing it does reaches
 * disk or any other frame: see `inMemoryBackend.ts`.
 *
 * The scope is fixed for the life of the document. A tab that moved between
 * scopes with client-side navigation would write half its session to each
 * database, so links between the manual and the editor are full page loads.
 */
export type DbScope = 'app' | 'manual' | 'embed'

/** First path segment under the app's base URL that selects the manual. */
export const MANUAL_ROUTE_SEGMENT = 'manual'

/** First path segment under the app's base URL that selects the embed. */
export const EMBED_ROUTE_SEGMENT = 'embed'

const startsWithSegment = (rest: string, segment: string): boolean =>
  rest === segment || rest.startsWith(`${segment}/`)

export const resolveDbScope = (pathname: string, baseUrl: string): DbScope => {
  const base = ensureTrailingSlash(baseUrl)
  if (!pathname.startsWith(base)) {
    return 'app'
  }
  const rest = pathname.slice(base.length)
  if (startsWithSegment(rest, MANUAL_ROUTE_SEGMENT)) {
    return 'manual'
  }
  if (startsWithSegment(rest, EMBED_ROUTE_SEGMENT)) {
    return 'embed'
  }
  return 'app'
}

const DB_NAMES: Record<DbScope, string> = {
  app: 'cyweb-db',
  manual: 'cyweb-manual-db',
  embed: 'cyweb-embed-db',
}

const UI_EVENTS_CHANNELS: Record<DbScope, string> = {
  app: 'cyweb-ui-events',
  manual: 'cyweb-manual-ui-events',
  embed: 'cyweb-embed-ui-events',
}

export const dbNameFor = (scope: DbScope): string => DB_NAMES[scope]

export const uiEventsChannelFor = (scope: DbScope): string =>
  UI_EVENTS_CHANNELS[scope]

/**
 * Whether the scope's database lives in memory rather than in the browser's
 * IndexedDB. Only the embed: it runs in someone else's page, where a visitor's
 * workspace must stay untouched and storage may be refused.
 */
export const isInMemoryScope = (scope: DbScope): boolean => scope === 'embed'

/**
 * The scope of this document. `import.meta.env.BASE_URL` is Vite's `base`,
 * which `vite.config.ts` sets from `config.urlBaseName`. Outside a browser
 * (node-environment tests) there is no address bar, and the scope is `app`.
 */
export const currentDbScope = (): DbScope =>
  typeof window === 'undefined'
    ? 'app'
    : resolveDbScope(window.location.pathname, import.meta.env.BASE_URL)
