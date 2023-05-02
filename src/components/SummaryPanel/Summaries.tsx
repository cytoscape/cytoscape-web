import { ReactElement } from 'react'
import { IdType } from '../../models/IdType'
import { NdexNetworkSummary } from '../../models/NetworkSummaryModel'
import { useCredentialStore } from '../../store/CredentialStore'
import { MessagePanel } from '../Messages'
import { NetworkPropertyPanel } from './NetworkPropertyPanel'

interface SummariesProps {
  summaries: Record<IdType, NdexNetworkSummary>
}

const EMPTY_MAP: Record<IdType, NdexNetworkSummary> = {}

export const Summaries = ({
  summaries = EMPTY_MAP,
}: SummariesProps): ReactElement => {
  const credentialInitialized: boolean = useCredentialStore(
    (state) => state.initialized,
  )

  const networkCount: number = Object.keys(summaries).length
  if (!credentialInitialized) {
    return <MessagePanel message="Initializing your workspace..." />
  } else if (networkCount === 0) {
    return <MessagePanel message="No network in workspace yet" />
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
