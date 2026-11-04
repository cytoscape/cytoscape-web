import { CirclePackingView } from '@/features/HierarchyViewer/model/CirclePackingView'
import { Cx2 } from '@/models/CxModel/Cx2'
import { getCyNetworkFromCx2 } from '@/models/CxModel/impl/converter'
import { CyNetwork } from '@/models/CyNetworkModel'
import { IdType } from '@/models/IdType'

import { buildDrawing, Drawing } from './drawing'
import {
  fetchSubsystemCx2,
  loadSubsystem,
  Subsystem,
  SubsystemRequest,
} from './hcx/loadSubsystem'
import { fetchCx2 } from './ndexRequests'

// Runs in the prepare worker, or on the page when no worker can start:
// nothing here may touch the DOM.

/** Work the page hands to the prepare worker. */
export type PrepareMessage =
  | { type: 'network'; networkId: IdType; host: string }
  | { type: 'prefetch'; key: string; request: SubsystemRequest; host: string }
  | {
      type: 'subsystem'
      key: string
      request: SubsystemRequest
      host: string
      hierarchyId: IdType
      subsystemId: IdType
      cellView: CirclePackingView
    }

export interface PreparedNetwork {
  cyNetwork: CyNetwork
  drawing: Drawing
}

/** The CX2 arrived but does not convert, as opposed to a failed request. */
export class InvalidNetworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidNetworkError'
  }
}

/**
 * The network with its topology as plain lists. The network model keeps
 * nodes and edges in a headless Cytoscape.js instance, which cannot be
 * posted between threads and duplicates every element in memory. Code that
 * needs the instance rebuilds it with networkModelToImplNetwork.
 */
const withPlainTopology = (cyNetwork: CyNetwork): CyNetwork => ({
  ...cyNetwork,
  network: {
    id: cyNetwork.network.id,
    nodes: cyNetwork.network.nodes,
    edges: cyNetwork.network.edges,
  },
})

/** Subsystem downloads kept, hovered or loaded, newest last. */
const MAX_CACHED_SUBSYSTEMS = 4

/**
 * A handler for PrepareMessages: fetch the CX2, convert it, apply the
 * visual style, and build the drawing. Keeps the last few subsystem
 * downloads, so a prefetched subsystem is not downloaded again.
 */
export const createPrepareHandler = () => {
  const subsystemCx2 = new Map<string, Promise<Cx2>>()

  const cachedSubsystemCx2 = (
    key: string,
    request: SubsystemRequest,
    host: string,
  ): Promise<Cx2> => {
    const cached = subsystemCx2.get(key)
    if (cached !== undefined) {
      subsystemCx2.delete(key)
      subsystemCx2.set(key, cached)
      return cached
    }
    const download = fetchSubsystemCx2(request, host)
    // A failed download is retried on the next hover or click
    download.catch(() => subsystemCx2.delete(key))
    subsystemCx2.set(key, download)
    if (subsystemCx2.size > MAX_CACHED_SUBSYSTEMS) {
      subsystemCx2.delete(subsystemCx2.keys().next().value as string)
    }
    return download
  }

  return async (
    message: PrepareMessage,
    signal: AbortSignal,
  ): Promise<PreparedNetwork | Subsystem | undefined> => {
    switch (message.type) {
      case 'network': {
        const cx2 = await fetchCx2(message.networkId, {
          host: message.host,
          signal,
        })
        let cyNetwork: CyNetwork
        try {
          cyNetwork = getCyNetworkFromCx2(message.networkId, cx2)
        } catch (error) {
          throw new InvalidNetworkError(
            error instanceof Error ? error.message : String(error),
          )
        }
        return {
          cyNetwork: withPlainTopology(cyNetwork),
          drawing: buildDrawing(cyNetwork),
        }
      }
      case 'prefetch':
        cachedSubsystemCx2(message.key, message.request, message.host)
        return undefined
      case 'subsystem': {
        const cx2 = await cachedSubsystemCx2(
          message.key,
          message.request,
          message.host,
        )
        const subsystem = loadSubsystem({
          hierarchyId: message.hierarchyId,
          subsystemId: message.subsystemId,
          cx2,
          cellView: message.cellView,
        })
        return {
          ...subsystem,
          cyNetwork: withPlainTopology(subsystem.cyNetwork),
        }
      }
    }
  }
}
