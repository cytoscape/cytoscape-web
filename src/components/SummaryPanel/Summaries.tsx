import { ReactElement } from 'react'
import { IdType } from '../../models/IdType'
import { NdexNetworkSummary } from '../../models/NetworkSummaryModel'
import { MessagePanel } from '../Messages'
import { NetworkPropertyPanel } from './NetworkPropertyPanel'

interface SummariesProps {
  summaries: Record<IdType, NdexNetworkSummary>
}

const EMPTY_MAP: Record<IdType, NdexNetworkSummary> = {}

export const Summaries = ({
  summaries = EMPTY_MAP,
}: SummariesProps): ReactElement => {
  if (Object.keys(summaries).length === 0) {
    return <MessagePanel message="No network in workspace" />
  } else {
    return (
      <>
        {Object.values(summaries).map((summary) => {
          return (
            <NetworkPropertyPanel key={summary.externalId} summary={summary} />
          )
        })}
      </>
    )
  }
}
