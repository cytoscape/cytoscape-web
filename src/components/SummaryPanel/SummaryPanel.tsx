import { Box, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { ReactElement, useContext } from 'react'
import { AppConfigContext } from '../../AppConfigContext'
import { NdexNetworkSummary } from '../../models/NetworkSummaryModel'

interface SummaryPanelProps {
  summary: NdexNetworkSummary
}
// TODO: add delete and accordion panel
export const SummaryPanel = ({ summary }: SummaryPanelProps): ReactElement => {
  const { ndexBaseUrl } = useContext(AppConfigContext)
  const theme = useTheme()

  const { externalId } = summary

  const ndexLink = `${ndexBaseUrl}/viewer/networks/${externalId}`
  const cxLink = `${ndexBaseUrl}/v3/networks/${externalId}`

  return (
    <Box
      sx={{
        padding: 0,
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
      key={externalId}
    >
      <Typography color={theme.palette.text.primary} variant={'caption'}>
        {summary.description}
      </Typography>
      <Box
        sx={{
          paddingTop: theme.spacing(1),
          display: 'flex',
          flexDirection: 'column',
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
