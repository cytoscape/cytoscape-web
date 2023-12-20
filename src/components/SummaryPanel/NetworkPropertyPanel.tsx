import { ReactElement, useState } from 'react'
import {
  Tooltip,
  IconButton,
  Box,
  Theme,
  Typography,
  Divider,
} from '@mui/material'
import { blueGrey } from '@mui/material/colors'
import { useTheme } from '@mui/material/styles'
import EditIcon from '@mui/icons-material/Edit'
import CircleIcon from '@mui/icons-material/Circle'

import { IdType } from '../../models/IdType'
import { NdexNetworkSummary } from '../../models/NetworkSummaryModel'
import { useWorkspaceStore } from '../../store/WorkspaceStore'
import { useViewModelStore } from '../../store/ViewModelStore'

import { NetworkPropertyEditor } from './NdexNetworkPropertyEditor'
import { HcxValidationButtonGroup } from '../../features/HierarchyViewer/components/ValidationButtons/HcxValidationErrorButtonGroup'

interface NetworkPropertyPanelProps {
  summary: NdexNetworkSummary
}

export const NetworkPropertyPanel = ({
  summary,
}: NetworkPropertyPanelProps): ReactElement => {
  const theme: Theme = useTheme()
  const { nodeCount, edgeCount } = summary

  // Need to use ID from the summary since it is different from the currentNetworkId
  const id: IdType = summary.externalId

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

  const networkViewModel = useViewModelStore((state) => state.viewModels[id])

  const showEditNetworkSummaryForm = (
    event: React.MouseEvent<HTMLButtonElement>,
  ): void => {
    event.stopPropagation()

    setEditNetworkSummaryAnchorEl(event.currentTarget)
  }

  const setCurrentNetworkId: (id: IdType) => void = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )

  const networkModified =
    useWorkspaceStore((state) => state.workspace.networkModified[id]) ?? false

  const backgroundColor: string =
    currentNetworkId === id ? blueGrey[100] : '#FFFFFF'

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
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography
              variant={'subtitle2'}
              sx={{ width: '100%', color: theme.palette.text.secondary }}
            >
              {`N: ${nodeCount} (${
                networkViewModel?.selectedNodes.length ?? 0
              }) /
          E: ${edgeCount} (${networkViewModel?.selectedEdges.length ?? 0})`}
            </Typography>

            <HcxValidationButtonGroup id={id} />
          </Box>
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

        <NetworkPropertyEditor
          anchorEl={editNetworkSummaryAnchorEl}
          summary={summary}
          onClose={hideEditNetworkSummaryForm}
        />
      </Box>
    </>
  )
}
