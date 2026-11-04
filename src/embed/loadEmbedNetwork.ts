import { NDExAuthError, NDExNotFoundError } from '@js4cytoscape/ndex-client'

import { getNDExBaseUrl } from '@/data/external-api/ndex/config'
import { fetchNdexSummaries } from '@/data/external-api/ndex/networkSummary'
import { CyNetwork } from '@/models/CyNetworkModel'
import { IdType } from '@/models/IdType'
import { NetworkSummary } from '@/models/NetworkSummaryModel'

import { Drawing } from './drawing'
import { isNotFound } from './ndexRequests'
import { InvalidNetworkError, PreparedNetwork } from './prepareHandler'
import { prepare } from './preparer'

/**
 * Above this node + edge count the embed shows the link-out instead.
 * `VITE_EMBED_MAX_ELEMENTS`, set at build time, overrides it. At 20,000 a
 * network is fully drawn in ~7 s on a laptop (embed_docs/performance.md).
 */
export const EMBED_MAX_ELEMENTS =
  Number(import.meta.env.VITE_EMBED_MAX_ELEMENTS) || 20_000

export type EmbedNetworkResult =
  | {
      kind: 'loaded'
      summary: NetworkSummary
      cyNetwork: CyNetwork
      drawing: Drawing
    }
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
 * Fetch one public NDEx network for the embed. The summary is requested on
 * the page; the CX2 is downloaded, converted and styled in the prepare
 * worker at the same time. The summary decides the size cap and HCX, and a
 * network over the cap aborts the worker's download. The CX2 passes
 * validateCX2() inside getCyNetworkFromCx2. Never throws; every failure is
 * a result kind.
 */
export const loadEmbedNetwork = async (
  networkId: IdType,
): Promise<EmbedNetworkResult> => {
  const job = prepare<PreparedNetwork>({
    type: 'network',
    networkId,
    host: getNDExBaseUrl(),
  })
  // Settled below, or abandoned when the summary ends the load
  job.promise.catch(() => undefined)

  let summary: NetworkSummary | undefined
  try {
    ;[summary] = await fetchNdexSummaries(networkId)
  } catch (error) {
    job.abort()
    return requestFailure(error)
  }
  if (summary === undefined) {
    job.abort()
    return { kind: 'not-found' }
  }
  if (summary.nodeCount + summary.edgeCount > EMBED_MAX_ELEMENTS) {
    job.abort()
    return { kind: 'too-large', summary }
  }

  try {
    const { cyNetwork, drawing } = await job.promise
    return { kind: 'loaded', summary, cyNetwork, drawing }
  } catch (error) {
    return error instanceof InvalidNetworkError
      ? { kind: 'invalid', summary, message: messageOf(error) }
      : requestFailure(error)
  }
}
