import { ReactElement } from 'react'
import { SummaryPanel } from '.'
import { IdType } from '../../models/IdType'
import { NdexNetworkSummary } from '../../models/NetworkSummaryModel'
import { MessagePanel } from '../MessagePanel'

interface SummariesProps {
  summaries: Record<IdType, NdexNetworkSummary>
  currentNetworkId: IdType
}

const EMPTY_MAP: Record<IdType, NdexNetworkSummary> = {}

export const Summaries = ({
  currentNetworkId = '',
  summaries = EMPTY_MAP,
}: SummariesProps): ReactElement => {
  if (Object.keys(summaries).length === 0) {
    return <MessagePanel message="No network in workspace" />
  } else {
    return (
      <>
        {Object.values(summaries).map((summary) => {
          const uuid: IdType = summary.externalId

          return (
            <SummaryPanel
              key={uuid}
              summary={summary}
              currentNetworkId={currentNetworkId}
            />
          )
        })}
      </>
    )
  }
}
