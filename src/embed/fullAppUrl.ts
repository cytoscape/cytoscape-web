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

/** What the full app opens selected, as its deep-link parameters carry it. */
export interface FullAppSelection {
  /** Selected nodes of the network, or the selected subsystem of a hierarchy. */
  nodeIds?: readonly IdType[]
  /** Hierarchy only: the subsystem whose network opens in the right panel. */
  subsystemId?: IdType
  /** Nodes selected in the subsystem's network. */
  subnetworkNodeIds?: readonly IdType[]
  /** Hierarchy only: 0 the hierarchy network, 1 the Cell View. */
  networkViewTab?: number
}

/**
 * URL that opens the network in the full app, with `selection` as its
 * deep-link parameters (docs/specifications/ROUTING_SPECIFICATION.md, URL
 * Parameters). Workspace `0` resolves to the viewer's current workspace
 * (URL Import).
 */
export const fullAppUrl = (
  networkId: IdType,
  {
    nodeIds = [],
    subsystemId,
    subnetworkNodeIds = [],
    networkViewTab,
  }: FullAppSelection = {},
): string => {
  const params = new URLSearchParams()
  if (nodeIds.length > 0) params.set('selectednodes', nodeIds.join(' '))
  if (subsystemId !== undefined) {
    params.set('activeNetworkView', `${networkId}_${subsystemId}`)
    if (subnetworkNodeIds.length > 0)
      params.set('selectedSubnetworkNodes', subnetworkNodeIds.join(' '))
  }
  if (networkViewTab !== undefined)
    params.set('activeNetworkViewTab', String(networkViewTab))
  const search = params.toString()
  return `${appBaseUrl()}0/networks/${encodeURIComponent(networkId)}${
    search === '' ? '' : `?${search}`
  }`
}
