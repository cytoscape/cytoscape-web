import { ReactElement, useState } from 'react'
import {
  Tooltip,
  IconButton,
  Box,
  Theme,
  Typography,
  Divider,
  Chip,
} from '@mui/material'
import { blueGrey } from '@mui/material/colors'
import { useTheme } from '@mui/material/styles'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CircleIcon from '@mui/icons-material/Circle'

import { IdType } from '../../models/IdType'
import { NdexNetworkSummary } from '../../models/NetworkSummaryModel'
import { useWorkspaceStore } from '../../store/WorkspaceStore'
import { useViewModelStore } from '../../store/ViewModelStore'

import { NetworkPropertyEditor } from './NdexNetworkPropertyEditor'
import { HcxValidationButtonGroup } from '../../features/HierarchyViewer/components/Validation/HcxValidationErrorButtonGroup'
import { ConfirmationDialog } from '../Util/ConfirmationDialog'
import { useNetworkStore } from '../../store/NetworkStore'
import { Network } from '../../models'

interface NetworkPropertyPanelProps {
  summary: NdexNetworkSummary
}

export const NetworkPropertyPanel = ({
  summary,
}: NetworkPropertyPanelProps): ReactElement => {
  const theme: Theme = useTheme()

  const [openConfirmation, setOpenConfirmation] = useState<boolean>(false)

  // Need to use ID from the summary since it is different from the currentNetworkId
  const id: IdType = summary.externalId

  // Get the network model from the store to grab the node and edge counts
  const networkModels = useNetworkStore((state) => state.networks)
  const networkModel: Network | undefined = networkModels.get(id)
  const nodeCount: number = networkModel?.nodes.length ?? 0
  const edgeCount: number = networkModel?.edges.length ?? 0

  const [editNetworkSummaryAnchorEl, setEditNetworkSummaryAnchorEl] = useState<
    HTMLButtonElement | undefined
  >(undefined)

  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const [lastOpenedNetworkId, setLastOpenedNetworkId] = useState<IdType>('')
  const setCurrentNetworkId: (id: IdType) => void = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )
  const networkViewModel = useViewModelStore((state) => state.getViewModel(id))

  const hideEditNetworkSummaryForm = (event: any): void => {
    event.stopPropagation()
    setEditNetworkSummaryAnchorEl(undefined)
  }

  const showEditNetworkSummaryForm = (
    event: React.MouseEvent<HTMLButtonElement>,
  ): void => {
    event.stopPropagation()
    setEditNetworkSummaryAnchorEl(event.currentTarget)
  }

  const networkModified =
    useWorkspaceStore((state) => state.workspace.networkModified[id]) ?? false

  const deleteNetwork = useWorkspaceStore((state) => state.deleteNetwork)

  const onClickDelete = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    setLastOpenedNetworkId(currentNetworkId)
    setCurrentNetworkId(id)
    setOpenConfirmation(true)
  }

  const onConfirmDelete = () => {
    deleteNetwork(id)
    if (lastOpenedNetworkId && lastOpenedNetworkId !== id) {
      setCurrentNetworkId(lastOpenedNetworkId)
    }
  }

  const onCancelDelete = () => {
    if (lastOpenedNetworkId && lastOpenedNetworkId !== id) {
      setCurrentNetworkId(lastOpenedNetworkId)
    }
  }

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
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Tooltip
                title={
                  summary.isNdex
                    ? 'A network stored in the NDEx database (ndexbio.org)'
                    : 'A network stored on your local machine'
                }
              >
                <Chip
                  color={summary.isNdex ? 'primary' : 'success'}
                  size="small"
                  sx={{ mr: 1, opacity: 0.8 }}
                  label={
                    <Typography sx={{ fontSize: 10 }} variant="caption">
                      {summary.isNdex ? 'NDEx' : 'Local'}
                    </Typography>
                  }
                />
              </Tooltip>
              <Typography variant={'body2'}>{summary.name}</Typography>
            </Box>
            {networkModifiedIcon}
          </Box>
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
            <Tooltip title="Edit network properties">
              <IconButton
                size="small"
                sx={{ width: 25, height: 25 }}
                onClick={(e) => {
                  setCurrentNetworkId(id)
                  showEditNetworkSummaryForm(e)
                }}
              >
                <EditIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Remove the network from workspace">
              <IconButton
                size="small"
                sx={{ width: 25, height: 25 }}
                onClick={(e) => {
                  onClickDelete(e)
                }}
              >
                <DeleteIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <NetworkPropertyEditor
          networkId={summary.externalId}
          anchorEl={editNetworkSummaryAnchorEl}
          onClose={hideEditNetworkSummaryForm}
        />
        <ConfirmationDialog
          title="Remove Network From Workspace"
          message={`Do you really want to delete the network, ${summary.name}?`}
          onCancel={onCancelDelete}
          onConfirm={onConfirmDelete}
          open={openConfirmation}
          setOpen={setOpenConfirmation}
          buttonTitle="Yes (cannot be undone)"
          isAlert={true}
        />
      </Box>
    </>
  )
}
