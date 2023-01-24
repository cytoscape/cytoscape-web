import { Box, Divider, Typography } from '@mui/material'
import { ReactElement, useContext } from 'react'
import { AppConfigContext } from '../../AppConfigContext'
import { NdexNetworkSummary } from '../../models/NetworkSummaryModel'

interface SummaryPanelProps {
  summary: NdexNetworkSummary
}
// TODO: add delete and accordion panel
export const SummaryPanel = ({ summary }: SummaryPanelProps): ReactElement => {
  const { ndexBaseUrl } = useContext(AppConfigContext)
  const { externalId } = summary

  const ndexLink = `${ndexBaseUrl}/viewer/networks/${externalId}`
  const cxLink = `${ndexBaseUrl}/v3/networks/${externalId}`

  return (
    <Box
      sx={{
        p: 1,
        display: 'flex',
        flexDirection: 'column',
      }}
      key={externalId}
    >
      <Typography>{summary.description}</Typography>
      <Divider />
      <Box
        sx={{
          p: 1,
          display: 'flex',
          flexDirection: 'column',
          // justifyContent: 'space-between',
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
