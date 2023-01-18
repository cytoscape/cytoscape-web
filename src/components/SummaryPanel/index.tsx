import { Box } from '@mui/material'
import { ReactElement } from 'react'
import { IdType } from '../../models/IdType'
import { NdexNetworkSummary } from '../../models/NetworkSummaryModel'
import { useWorkspaceStore } from '../../store/WorkspaceStore'

interface SummaryPanelProps {
  summary: NdexNetworkSummary
  currentNetworkId: IdType
}

export const SummaryPanel = (props: SummaryPanelProps): ReactElement => {
  const { summary, currentNetworkId } = props
  const { externalId } = summary

  const setCurrentNetworkId: (id: IdType) => void = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )

  const ndexLink = `https://ndexbio.org/viewer/networks/${externalId}`
  const cxLink = `https://ndexbio.org/v3/networks/${externalId}`

  return (
    <Box
      sx={{
        backgroundColor: externalId === currentNetworkId ? 'gray' : 'white',
        p: 1,
        display: 'flex',
        flexDirection: 'column',
      }}
      onClick={() => setCurrentNetworkId(externalId)}
      key={externalId}
    >
      <Box sx={{ p: 1 }}> {summary.name}</Box>
      <Box
        sx={{
          p: 1,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <a href={ndexLink} target="_blank" rel="noreferrer">
          Compare in NDEx
        </a>
        <a href={cxLink} target="_blank" rel="noreferrer">
          Debug cx
        </a>
      </Box>
    </Box>
  )
}
