import { ReactElement } from 'react'
import { NetworkSummary } from '../../models/NetworkSummaryModel'
import { NetworkPropertyPanel } from './NetworkPropertyPanel'
import { MessagePanel } from '../Messages'
import { useNetworkSummaryStore } from '../../hooks/stores/NetworkSummaryStore'

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
