import { ReactElement, useState } from 'react'
import {
  Tooltip,
  IconButton,
  Box,
  Chip,
  Theme,
  Typography,
  Divider,
  Paper,
  Popover,
  TextField,
} from '@mui/material'
import { blueGrey } from '@mui/material/colors'
import { useTheme } from '@mui/material/styles'
import EditIcon from '@mui/icons-material/Edit'
import CircleIcon from '@mui/icons-material/Circle'

import { IdType } from '../../models/IdType'
import { NdexNetworkSummary } from '../../models/NetworkSummaryModel'
import { useWorkspaceStore } from '../../store/WorkspaceStore'
import { useViewModelStore } from '../../store/ViewModelStore'
import { useNetworkSummaryStore } from '../../store/NetworkSummaryStore'
import { NetworkView } from '../../models/ViewModel'
import NdexNetworkPropertyTable from './NdexNetworkPropertyTable'

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

  const hideEditNetworkSummaryForm = (event: any): void => {
    event.stopPropagation()
    setEditNetworkSummaryAnchorEl(undefined)
  }

  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const showEditNetworkSummaryForm = (
    event: React.MouseEvent<HTMLButtonElement>,
  ): void => {
    event.stopPropagation()

    setEditNetworkSummaryAnchorEl(event.currentTarget)
  }
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

  const updateNetworkSummary = useNetworkSummaryStore((state) => state.update)

  const networkModified = useWorkspaceStore(
    (state) => state.workspace.networkModified[id],
  )

  const backgroundColor: string =
    currentNetworkId === id ? blueGrey[100] : '#FFFFFF'

  // todo add this somewhere in the component tree
  // const lastModifiedDate =
  //   summary.modificationTime !== undefined
  //     ? new Date(summary.modificationTime).toLocaleString()
  //     : ''

  const networkModifiedIcon = networkModified ? (
    <Tooltip title="Network has been modified">
      <CircleIcon sx={{ color: theme.palette.error.main, fontSize: 10 }} />
    </Tooltip>
  ) : null

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
        }}
        onClick={() => {
          setCurrentNetworkId(id)
        }}
      >
        <Box sx={{ width: '100%' }}>
          <Typography
            variant={'body2'}
            sx={{ width: '100%', display: 'flex', alignItems: 'center' }}
          >
            {summary.name}
            {networkModifiedIcon}
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
            onClick={(e) => {
              setCurrentNetworkId(id)
              showEditNetworkSummaryForm(e)
            }}
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
          <Paper
            sx={{
              p: 2,
              width: 800,
              height: 800,
              overflowY: 'scroll',
            }}
          >
            <Chip
              sx={{ p: 1, mb: 2 }}
              size="small"
              label={
                <Typography variant="caption">{summary.visibility}</Typography>
              }
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <TextField
                size="small"
                label="Name"
                sx={{ width: '60%', mr: 1, fontSize: 12 }}
                value={summary.name}
                onChange={(e) => {
                  updateNetworkSummary(summary.externalId, {
                    name: e.target.value,
                  })
                }}
              ></TextField>
              <TextField
                size="small"
                label="Version"
                sx={{ width: '20%', fontSize: 12 }}
                value={summary.version}
                onChange={(e) =>
                  updateNetworkSummary(summary.externalId, {
                    version: e.target.value,
                  })
                }
              />
            </Box>

            <TextField
              size="small"
              label="Description"
              sx={{ width: '100%', mt: 2, fontSize: 12 }}
              multiline
              onChange={(e) => {
                updateNetworkSummary(summary.externalId, {
                  description: e.target.value,
                })
              }}
              value={summary.description}
            ></TextField>
            <Divider sx={{ mt: 2, mb: 1 }} />
            <NdexNetworkPropertyTable />
          </Paper>
        </Popover>
      </Box>
    </>
  )
}
