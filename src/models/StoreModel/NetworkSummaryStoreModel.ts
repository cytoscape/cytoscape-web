import { IdType } from '../IdType'
import { NetworkSummary } from '../NetworkSummaryModel'

export interface NetworkSummaryState {
  summaries: Record<IdType, NetworkSummary>
}

export interface NetworkSummaryActions {
  // Add a network summary to the store
  add: (networkId: IdType, summary: NetworkSummary) => void

  // Batch add network summaries to the store
  addAll: (summaries: Record<IdType, NetworkSummary>) => void

  // Update an entry
  update: (id: IdType, summary: Partial<NetworkSummary>) => void

  // Delete a network summary from the store
  delete: (networkId: IdType) => void

  // Delete all summaries from the store
  deleteAll: () => void
}

export type NetworkSummaryStore = NetworkSummaryState & NetworkSummaryActions
