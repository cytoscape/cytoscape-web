import { ReactElement, useState } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Theme,
  Typography,
} from '@mui/material'
import { blueGrey } from '@mui/material/colors'
import { useTheme } from '@mui/material/styles'

import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { SummaryPanel } from './SummaryPanel'
import { IdType } from '../../models/IdType'
import { NdexNetworkSummary } from '../../models/NetworkSummaryModel'
import { useWorkspaceStore } from '../../store/WorkspaceStore'
import { useViewModelStore } from '../../store/ViewModelStore'
import { NetworkView } from '../../models/ViewModel'

interface NetworkPropertyPanelProps {
  summary: NdexNetworkSummary
}

export const NetworkPropertyPanel = ({
  summary,
}: NetworkPropertyPanelProps): ReactElement => {
  const theme: Theme = useTheme()

  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const id: IdType = summary.externalId

  const networkViewModel: NetworkView = useViewModelStore(
    (state) => state.viewModels[id],
  )
  const selectedNodes: IdType[] =
    networkViewModel !== undefined ? networkViewModel.selectedNodes : []
  const selectedEdges: IdType[] =
    networkViewModel !== undefined ? networkViewModel.selectedEdges : []

  const setCurrentNetworkId: (id: IdType) => void = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )

  const [expanded, setExpanded] = useState<boolean>(false)

  const handleChange = (): void => {
    setExpanded(!expanded)
  }


  const backgroundColor: string = currentNetworkId === id ? blueGrey[100] : '#FFFFFF'

  return (
    <Accordion
      expanded={expanded}
      onChange={handleChange}
      onClick={() => {
        setTimeout(() => {
          setCurrentNetworkId(id)
        }, 200)
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="network-props-content"
        id="network-props-header"
        sx={{ backgroundColor, width: '100%'}}
      >
        <Box sx={{ width: '100%'}}>
          <Typography variant={'body1'} sx={{ width: '100%' }}>{summary.name}</Typography>
          <Typography
            variant={'subtitle2'}
            sx={{width: '100%', color: theme.palette.text.secondary}}
          >
            {`N: ${summary.nodeCount} (${selectedNodes.length}) / 
          E: ${summary.edgeCount} (${selectedEdges.length})`}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <SummaryPanel summary={summary} />
      </AccordionDetails>
    </Accordion>
  )
}
