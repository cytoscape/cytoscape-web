import {
  NetworkProperty,
  NetworkSummary,
} from '../../../models/NetworkSummaryModel'
import { NdexNetworkProperty } from './NdexNetworkProperty'

/**
 * NdexNetworkSummary represents a network summary from NDEx API.
 * It is derived from NetworkSummary but excludes the 'isNdex' field
 * since all summaries from NDEx are implicitly NDEx summaries.
 * Properties use NdexNetworkProperty for API consistency.
 *
 * Note: nodeCount and edgeCount are included here because NDEx API returns them,
 * but they are removed during normalization to NetworkSummary.
 */
export type NdexNetworkSummary = Omit<
  NetworkSummary,
  'isNdex' | 'properties'
> & {
  properties: NdexNetworkProperty[]
  nodeCount: number
  edgeCount: number
}
