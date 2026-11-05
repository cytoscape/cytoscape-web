import { IdType } from '@/models/IdType'

export interface EmbedSelection {
  /** Nodes of the network, or subsystems of a hierarchy. */
  nodeIds: IdType[]
  /** Nodes of the selected subsystem's interaction network. */
  subnetworkNodeIds: IdType[]
  /** Hierarchy tab, counted as the full app counts it: 0 Hierarchy, 1 Cell View. */
  networkViewTab?: number
}

const readIds = (params: URLSearchParams, name: string): IdType[] =>
  (params.get(name) ?? '').split(/\s+/).filter((id) => id !== '')

/**
 * Read the selection from the full app's deep-link parameters
 * (docs/specifications/ROUTING_SPECIFICATION.md): `selectednodes` and
 * `selectedSubnetworkNodes`, each a space-separated list of node ids, and
 * `activeNetworkViewTab`. The embed ignores the full app's other parameters.
 */
export const readSelectionFromSearch = (search: string): EmbedSelection => {
  const params = new URLSearchParams(search)
  const tab = Number.parseInt(params.get('activeNetworkViewTab') ?? '', 10)
  return {
    nodeIds: readIds(params, 'selectednodes'),
    subnetworkNodeIds: readIds(params, 'selectedSubnetworkNodes'),
    ...(Number.isInteger(tab) && tab >= 0 ? { networkViewTab: tab } : {}),
  }
}
