import { putNetworkSummaryToDb } from '@/data/db'
import { fetchNdexSummaries } from '@/data/external-api/ndex'
import { useNetworkSummaryStore } from '@/data/hooks/stores/NetworkSummaryStore'
import { useWorkspaceStore } from '@/data/hooks/stores/WorkspaceStore'
import { logStartup } from '@/debug'
import type { IdType } from '@/models/IdType'
import type { NetworkSummary } from '@/models/NetworkSummaryModel'
import {
  fitsNetworkSizeLimits,
  type NetworkSizeLimits,
} from '@/models/NetworkSummaryModel/impl/networkSizeLimit'
import { createWorkspace } from '@/models/WorkspaceModel/impl/workspaceImpl'
import { DEEP_LINK_TIMEOUT_MS, withTimeout } from './resolveDeepLink'

// The embed's half of the boot (EMBED_MODE_SPECIFICATION.md). It replaces
// runAppShellBoot, which reads the visitor's saved workspace, runs URL imports
// and app installs, and navigates to the editor: none of that belongs in a
// read-only frame. This one resolves the network's NDEx summary, checks its
// size before any CX2 is downloaded, and publishes a workspace that holds only
// that network.

/** What the embed shows. Every state but `ready` is a message in the frame. */
export type EmbedStatus =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'key-rejected' }
  | { kind: 'too-large'; name: string; elementCount: number }
  | { kind: 'unreachable' }
  | { kind: 'invalid'; name: string; message: string }
  | { kind: 'ready'; summary: NetworkSummary }

/** HTTP status of an NDEx client error, when it carries one. */
export const statusOf = (error: unknown): number | undefined => {
  const status = (error as { statusCode?: unknown } | null)?.statusCode
  return typeof status === 'number' ? status : undefined
}

/**
 * Maps a failed summary request to a status. 404 is "not found". 401 and 403
 * mean a private network: "not found" without a key, as NDEx says for a
 * network the visitor may not read, and "key rejected" with one. Anything
 * else, including a timeout, is "unreachable".
 */
export const statusForSummaryError = (
  error: unknown,
  hasAccessKey: boolean,
): EmbedStatus => {
  const status = statusOf(error)
  if (status === 404) {
    return { kind: 'not-found' }
  }
  if (status === 401 || status === 403) {
    return hasAccessKey ? { kind: 'key-rejected' } : { kind: 'not-found' }
  }
  return { kind: 'unreachable' }
}

export interface EmbedBootOptions {
  networkId: IdType
  accessKey?: string
  limits: NetworkSizeLimits
}

/**
 * Resolves the network the embed shows. On success the summary is in the
 * summary store and the in-memory database, and the workspace holds only this
 * network; the CX2 is loaded next, by the same loader the editor uses.
 */
export const runEmbedBoot = async ({
  networkId,
  accessKey,
  limits,
}: EmbedBootOptions): Promise<EmbedStatus> => {
  let summary: NetworkSummary | undefined
  try {
    summary = (
      await withTimeout(
        fetchNdexSummaries(networkId, undefined, undefined, accessKey),
        DEEP_LINK_TIMEOUT_MS,
        `NDEx did not respond within ${DEEP_LINK_TIMEOUT_MS / 1000}s`,
      )
    )[0]
  } catch (error) {
    logStartup.warn(`[embed]: summary request for ${networkId} failed`, error)
    return statusForSummaryError(error, accessKey !== undefined)
  }

  // NDEx leaves out of the answer a network it does not have and one the
  // request may not read.
  if (summary === undefined) {
    return accessKey !== undefined
      ? { kind: 'key-rejected' }
      : { kind: 'not-found' }
  }

  if (!fitsNetworkSizeLimits(summary, limits)) {
    return {
      kind: 'too-large',
      name: summary.name,
      elementCount: summary.nodeCount + summary.edgeCount,
    }
  }

  // Cached first, so the network loader finds it and does not ask NDEx again
  await putNetworkSummaryToDb(summary)
  useNetworkSummaryStore.getState().addAll({ [networkId]: summary })
  useWorkspaceStore.getState().set({
    ...createWorkspace(),
    networkIds: [networkId],
    currentNetworkId: networkId,
  })

  return { kind: 'ready', summary }
}
