import config from '@/assets/config.json'
import { IdType } from '@/models/IdType'
import { ensureTrailingSlash } from '@/utils/baseUrl'

/** The embed dev server (5502) does not serve the app; its dev server does. */
const DEV_APP_ORIGIN = 'http://localhost:5500'

/**
 * Base URL of the full app the embed links to. `VITE_EMBED_APP_URL`, set at
 * build time, overrides it for an embed deployed without the app, e.g.
 * `VITE_EMBED_APP_URL=https://web.cytoscape.org/`. Otherwise the app is on
 * the same deployment as the embed.
 */
const appBaseUrl = (): string => {
  const configured = import.meta.env.VITE_EMBED_APP_URL
  if (configured) return ensureTrailingSlash(configured)
  const origin = import.meta.env.DEV ? DEV_APP_ORIGIN : window.location.origin
  return `${origin}${ensureTrailingSlash(config.urlBaseName)}`
}

/**
 * URL that opens the network in the full app. Workspace `0` resolves to the
 * viewer's current workspace (docs/specifications/ROUTING_SPECIFICATION.md,
 * URL Import).
 */
export const fullAppUrl = (networkId: IdType): string =>
  `${appBaseUrl()}0/networks/${encodeURIComponent(networkId)}`
