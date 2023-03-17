import { ReactElement, useState } from 'react'
import {
  Tooltip,
  IconButton,
  Box,
  Theme,
  Typography,
  Divider,
  Paper,
  Popover,
} from '@mui/material'
import { blueGrey } from '@mui/material/colors'
import { useTheme } from '@mui/material/styles'
import EditIcon from '@mui/icons-material/Edit'

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

  const [editNetworkSummaryAnchorEl, setEditNetworkSummaryAnchorEl] = useState<
    HTMLButtonElement | undefined
  >(undefined)

  const showEditNetworkSummaryForm = (
    event: React.MouseEvent<HTMLButtonElement>,
  ): void => {
    event.stopPropagation()
    setEditNetworkSummaryAnchorEl(event.currentTarget)
  }

  const hideEditNetworkSummaryForm = (event: any): void => {
    event.stopPropagation()
    setEditNetworkSummaryAnchorEl(undefined)
  }

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

  const backgroundColor: string =
    currentNetworkId === id ? blueGrey[100] : '#FFFFFF'

  return (
    <>
      <Divider />
      <Box
        sx={{
          backgroundColor,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          '&:hover': { cursor: 'pointer' },
          p: 1,
          pt: 2,
          pb: 2,
        }}
        onClick={() => {
          setCurrentNetworkId(id)
        }}
      >
        <Box sx={{ width: '100%' }}>
          <Typography variant={'body2'} sx={{ width: '100%' }}>
            {summary.name}
          </Typography>
          <Typography
            variant={'subtitle2'}
            sx={{ width: '100%', color: theme.palette.text.secondary }}
          >
            {`N: ${summary.nodeCount} (${selectedNodes.length}) /
          E: ${summary.edgeCount} (${selectedEdges.length})`}
          </Typography>
        </Box>
        <Tooltip title="Edit network properties">
          <IconButton
            size="small"
            sx={{ width: 30, height: 30 }}
            onClick={showEditNetworkSummaryForm}
          >
            <EditIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        <Popover
          open={editNetworkSummaryAnchorEl !== undefined}
          anchorEl={editNetworkSummaryAnchorEl}
          onClose={hideEditNetworkSummaryForm}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <Paper sx={{ p: 1 }}>
            <Typography variant={'body2'}>{summary.name}</Typography>
            <Typography variant={'body2'}>
              {JSON.stringify(summary, null, 2)}
            </Typography>
          </Paper>
        </Popover>
      </Box>
    </>
  )
}
