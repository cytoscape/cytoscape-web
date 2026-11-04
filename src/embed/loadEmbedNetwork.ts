import { NDExAuthError, NDExNotFoundError } from '@js4cytoscape/ndex-client'

import { fetchNdexSummaries } from '@/data/external-api/ndex/networkSummary'
import { Cx2 } from '@/models/CxModel/Cx2'
import { getCyNetworkFromCx2 } from '@/models/CxModel/impl/converter'
import { CyNetwork } from '@/models/CyNetworkModel'
import { IdType } from '@/models/IdType'
import { NetworkSummary } from '@/models/NetworkSummaryModel'

import { fetchCx2, isNotFound } from './ndexRequests'

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
  error instanceof NDExNotFoundError ||
  error instanceof NDExAuthError ||
  isNotFound(error)
    ? { kind: 'not-found' }
    : { kind: 'unreachable', message: messageOf(error) }

/**
 * Fetch one public NDEx network for the embed. The summary and the CX2 are
 * requested together; the summary decides the size cap and HCX, and a
 * network over the cap aborts its CX2 download. The CX2 passes
 * validateCX2() inside getCyNetworkFromCx2. Never throws; every failure is
 * a result kind.
 */
export const loadEmbedNetwork = async (
  networkId: IdType,
): Promise<EmbedNetworkResult> => {
  const cx2Request = new AbortController()
  const cx2Promise = fetchCx2(networkId, { signal: cx2Request.signal })
  // Settled below, or abandoned when the summary ends the load
  cx2Promise.catch(() => undefined)

  let summary: NetworkSummary | undefined
  try {
    ;[summary] = await fetchNdexSummaries(networkId)
  } catch (error) {
    cx2Request.abort()
    return requestFailure(error)
  }
  if (summary === undefined) {
    cx2Request.abort()
    return { kind: 'not-found' }
  }
  if (summary.nodeCount + summary.edgeCount > EMBED_MAX_ELEMENTS) {
    cx2Request.abort()
    return { kind: 'too-large', summary }
  }

  let cx2: Cx2
  try {
    cx2 = await cx2Promise
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
