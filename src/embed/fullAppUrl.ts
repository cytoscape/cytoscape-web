import config from '@/assets/config.json'
import { IdType } from '@/models/IdType'
import { ensureTrailingSlash } from '@/utils/baseUrl'

/** The embed dev server (5502) does not serve the app; its dev server does. */
const DEV_APP_ORIGIN = 'http://localhost:5500'

/**
 * URL that opens the network in the full app on the same deployment as the
 * embed. Workspace `0` resolves to the viewer's current workspace
 * (docs/specifications/ROUTING_SPECIFICATION.md, URL Import).
 */
export const fullAppUrl = (networkId: IdType): string =>
  `${import.meta.env.DEV ? DEV_APP_ORIGIN : window.location.origin}${ensureTrailingSlash(config.urlBaseName)}0/networks/${encodeURIComponent(networkId)}`
