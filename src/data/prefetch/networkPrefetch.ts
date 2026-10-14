import { getCyNetworkFromDb } from '@/data/db'
import type { CyNetwork } from '@/models/CyNetworkModel'
import type { IdType } from '@/models/IdType'
import { logDb } from '@/debug'

// Overlaps the current network's IndexedDB read with the rest of boot: the id
// is known at the PUBLISH step, but the read otherwise starts only after the
// WorkspaceEditor chunk has downloaded, parsed and mounted. Cache-only on
// purpose — the NDEx fallback needs the auth token and must not race the SSO
// check anonymously; a cache miss simply falls through to the normal path.

const inflight = new Map<IdType, Promise<CyNetwork>>()

export const prefetchCyNetworkFromDb = (id: IdType): void => {
  if (id === '' || inflight.has(id)) {
    return
  }
  const read = getCyNetworkFromDb(id)
  inflight.set(id, read)
  read.catch(() => {
    // A failed read must not be handed to a later consumer; deleting it lets
    // the normal load path run (including its NDEx fallback).
    inflight.delete(id)
    logDb.info(`[networkPrefetch]: cache miss for ${id}`)
  })
}

/**
 * Hands the in-flight read to its consumer (one-shot). A second consumer just
 * performs the normal Dexie read, which is idempotent.
 */
export const takePrefetchedCyNetwork = (
  id: IdType,
): Promise<CyNetwork> | undefined => {
  const read = inflight.get(id)
  inflight.delete(id)
  return read
}
