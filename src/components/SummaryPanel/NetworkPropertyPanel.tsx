import { ReactElement, useState } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Typography,
} from '@mui/material'
import { blueGrey } from '@mui/material/colors'

import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { SummaryPanel } from './SummaryPanel'
import { IdType } from '../../models/IdType'
import { NdexNetworkSummary } from '../../models/NetworkSummaryModel'
import { useWorkspaceStore } from '../../store/WorkspaceStore'

interface NetworkPropertyPanelProps {
  summary: NdexNetworkSummary
}

export const NetworkPropertyPanel = ({
  summary,
}: NetworkPropertyPanelProps): ReactElement => {
  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const setCurrentNetworkId: (id: IdType) => void = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )

  const [expanded, setExpanded] = useState<boolean>(false)

  const handleChange = (): void => {
    setExpanded(!expanded)
  }

  return (
    <Accordion
      expanded={expanded}
      onChange={handleChange}
      onClick={() => {
        setTimeout(() => {
          setCurrentNetworkId(summary.externalId)
        }, 300)
      }}
      sx={{
        backgroundColor:
          currentNetworkId === summary.externalId ? blueGrey[100] : 'white',
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="network-props-content"
        id="network-props-header"
      >
        <Typography sx={{ width: '100%' }}>{summary.name}</Typography>
        <Typography
          sx={{ paddingLeft: '0.5em', width: '50%', color: 'text.secondary' }}
        >
          N: {summary.nodeCount} / E: {summary.edgeCount}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <SummaryPanel summary={summary} />
      </AccordionDetails>
    </Accordion>
  )
}
