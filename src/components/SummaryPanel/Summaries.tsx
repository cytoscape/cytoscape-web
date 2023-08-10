import { ReactElement } from 'react'
import { IdType } from '../../models/IdType'
import { NdexNetworkSummary } from '../../models/NetworkSummaryModel'
import { NetworkPropertyPanel } from './NetworkPropertyPanel'
import { MessagePanel } from '../Messages'

interface SummariesProps {
  summaries: Record<IdType, NdexNetworkSummary>
}

export const Summaries = ({ summaries }: SummariesProps): ReactElement => {
  const summaryData = Object.values(summaries)

  if (summaryData.length === 0) {
    return <MessagePanel message="Initializing..." showProgress={true} />
  }
  return (
    <>
      {summaryData.map((summary: NdexNetworkSummary) => {
        return (
          <NetworkPropertyPanel key={summary.externalId} summary={summary} />
        )
      })}
    </>
  )
}
