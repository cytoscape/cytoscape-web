import { IdType } from '../../IdType'
import { NetworkSummary } from '../NetworkSummary'

export interface NetworkSummaryState {
  summaries: Record<IdType, NetworkSummary>
}

/**
 * Add a summary for a network
 */
export const add = (
  state: NetworkSummaryState,
  networkId: IdType,
  summary: NetworkSummary,
): NetworkSummaryState => {
  return {
    ...state,
    summaries: {
      ...state.summaries,
      [networkId]: summary,
    },
  }
}

/**
 * Add multiple summaries
 */
export const addAll = (
  state: NetworkSummaryState,
  summaries: Record<IdType, NetworkSummary>,
): NetworkSummaryState => {
  return {
    ...state,
    summaries: {
      ...state.summaries,
      ...summaries,
    },
  }
}

/**
 * Update a summary
 */
export const update = (
  state: NetworkSummaryState,
  networkId: IdType,
  summaryUpdate: Partial<NetworkSummary>,
): NetworkSummaryState => {
  const summary = state.summaries[networkId]
  if (summary === undefined) {
    return state
  }

  return {
    ...state,
    summaries: {
      ...state.summaries,
      [networkId]: {
        ...summary,
        ...summaryUpdate,
      },
    },
  }
}

/**
 * Delete a summary for a network
 */
export const deleteSummary = (
  state: NetworkSummaryState,
  networkId: IdType,
): NetworkSummaryState => {
  const { [networkId]: deleted, ...restSummaries } = state.summaries
  return {
    ...state,
    summaries: restSummaries,
  }
}

/**
 * Delete all summaries
 */
export const deleteAll = (state: NetworkSummaryState): NetworkSummaryState => {
  return {
    ...state,
    summaries: {},
  }
}
