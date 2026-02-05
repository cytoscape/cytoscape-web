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
 */
export type NdexNetworkSummary = Omit<
  NetworkSummary,
  'isNdex' | 'properties'
> & {
  properties: NdexNetworkProperty[]
}
