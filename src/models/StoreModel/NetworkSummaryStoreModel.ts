import { IdType } from '../IdType'
import { NdexNetworkSummary } from '../NetworkSummaryModel'

export interface NetworkSummaryStore {
  summaries: Record<IdType, NdexNetworkSummary>
}

export interface NetworkSummaryActions {
  // Add a network summary to the store
  add: (networkId: IdType, summary: NdexNetworkSummary) => void

  // Batch add network summaries to the store
  addAll: (summaries: Record<IdType, NdexNetworkSummary>) => void

  // Update an entry
  update: (id: IdType, summary: Partial<NdexNetworkSummary>) => void

  // Delete a network summary from the store
  delete: (networkId: IdType) => void

  // Delete all summaries from the store
  deleteAll: () => void
}

export type NetworkSummaryStoreModel = NetworkSummaryStore &
  NetworkSummaryActions
