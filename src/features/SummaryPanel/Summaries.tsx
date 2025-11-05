import { ReactElement } from 'react'

import { useNetworkSummaryStore } from '../../hooks/stores/NetworkSummaryStore'
import { NetworkSummary } from '../../models/NetworkSummaryModel'
import { MessagePanel } from '../Messages'
import { NetworkPropertyPanel } from './NetworkPropertyPanel'

export const Summaries = (): ReactElement => {
  const summaries = useNetworkSummaryStore((state) => state.summaries)

  const summaryData = Object.values(summaries)
  if (summaryData.length === 0) {
    return <MessagePanel message="No network in workspace" />
  }

  return (
    <>
      {summaryData.map((summary: NetworkSummary) => {
        return (
          <NetworkPropertyPanel key={summary.externalId} summary={summary} />
        )
      })}
    </>
  )
}
