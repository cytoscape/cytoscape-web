import { NDExAuthError, NDExNotFoundError } from '@js4cytoscape/ndex-client'

import { fetchNdexNetwork } from '@/data/external-api/ndex/network'
import { fetchNdexSummaries } from '@/data/external-api/ndex/networkSummary'
import { getCyNetworkFromCx2 } from '@/models/CxModel/impl/converter'
import { CyNetwork } from '@/models/CyNetworkModel'
import { IdType } from '@/models/IdType'
import { NetworkSummary } from '@/models/NetworkSummaryModel'

/**
 * Above this node + edge count the embed shows the link-out instead.
 * `VITE_EMBED_MAX_ELEMENTS`, set at build time, overrides it.
 */
export const EMBED_MAX_ELEMENTS =
  Number(import.meta.env.VITE_EMBED_MAX_ELEMENTS) || 10_000

export type EmbedNetworkResult =
  | { kind: 'loaded'; summary: NetworkSummary; cyNetwork: CyNetwork }
  | { kind: 'too-large'; summary: NetworkSummary }
  | { kind: 'not-found' }
  | { kind: 'unreachable'; message: string }
  | { kind: 'invalid'; summary: NetworkSummary; message: string }

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

/**
 * Sort an NDEx request failure. A private network answers 401/403, which
 * the embed treats as not found: it shows public networks only.
 */
const requestFailure = (error: unknown): EmbedNetworkResult =>
  error instanceof NDExNotFoundError || error instanceof NDExAuthError
    ? { kind: 'not-found' }
    : { kind: 'unreachable', message: messageOf(error) }

/**
 * Fetch one public NDEx network for the embed: the summary first, which
 * decides the size cap and HCX, then the CX2. The CX2 passes validateCX2()
 * inside getCyNetworkFromCx2. Never throws; every failure is a result kind.
 */
export const loadEmbedNetwork = async (
  networkId: IdType,
): Promise<EmbedNetworkResult> => {
  let summary: NetworkSummary | undefined
  try {
    ;[summary] = await fetchNdexSummaries(networkId)
  } catch (error) {
    return requestFailure(error)
  }
  if (summary === undefined) {
    return { kind: 'not-found' }
  }
  if (summary.nodeCount + summary.edgeCount > EMBED_MAX_ELEMENTS) {
    return { kind: 'too-large', summary }
  }

  let cx2
  try {
    cx2 = await fetchNdexNetwork(networkId)
  } catch (error) {
    return requestFailure(error)
  }

  try {
    return {
      kind: 'loaded',
      summary,
      cyNetwork: getCyNetworkFromCx2(networkId, cx2),
    }
  } catch (error) {
    return { kind: 'invalid', summary, message: messageOf(error) }
  }
}
