import { ReactElement } from 'react'

import { useNetworkSummaryStore } from '../../data/hooks/stores/NetworkSummaryStore'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import { NetworkSummary } from '../../models/NetworkSummaryModel'
import { MessagePanel } from '../Messages'
import { NetworkPropertyPanel } from './NetworkPropertyPanel'

export const Summaries = (): ReactElement => {
  const summaries = useNetworkSummaryStore((state) => state.summaries)
  const workspace = useWorkspaceStore((state) => state.workspace)

  const summaryData = Object.values(summaries)

  // When summaries are empty, check if workspace is still initializing
  // If workspace hasn't been initialized yet (id is empty), show loading state
  // This prevents "No network in workspace" from flashing during initial load
  if (summaryData.length === 0) {
    if (workspace.id === '') {
      return <MessagePanel message="Loading workspace..." />
    }
    return <MessagePanel message="No networks in workspace" />
  }

  return (
    <div data-testid="summaries">
      {summaryData.map((summary: NetworkSummary) => {
        return (
          <NetworkPropertyPanel key={summary.externalId} summary={summary} />
        )
      })}
    </div>
  )
}
