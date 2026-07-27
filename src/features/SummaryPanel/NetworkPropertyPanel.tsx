import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import {
  Badge,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Theme,
  Tooltip,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { lazy, ReactElement, Suspense, useContext, useState } from 'react'

import { useViewModelStore } from '../../data/hooks/stores/ViewModelStore'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import { useSaveCurrentNetworkToNDEx } from '../../data/hooks/useSaveCurrentNetworkToNDEx'
import { KeycloakContext } from '../../init/keycloak'
import { IdType } from '../../models/IdType'
import { NetworkSummary } from '../../models/NetworkSummaryModel'
import { getSaveButtonState, getSaveMenuItemState } from './networkSaveStatus'

// Lazy load the heavy network property editor with rich text editing capabilities
const NetworkPropertyEditor = lazy(() => import('./NetworkPropertyEditor'))
import { useUrlNavigation } from '../../data/hooks/navigation/useUrlNavigation'
import { useNetworkStore } from '../../data/hooks/stores/NetworkStore'
import { useDeleteCyNetwork } from '../../data/hooks/useDeleteCyNetwork'
import { Network } from '../../models'
import { ConfirmationDialog } from '../ConfirmationDialog'
import { HcxValidationButtonGroup } from '../HierarchyViewer/components/Validation/HcxValidationErrorButtonGroup'

interface NetworkPropertyPanelProps {
  summary: NetworkSummary
}

export const NetworkPropertyPanel = ({
  summary,
}: NetworkPropertyPanelProps): ReactElement => {
  const theme: Theme = useTheme()
  const { navigateToNetwork } = useUrlNavigation()
  const workspace = useWorkspaceStore((state) => state.workspace)
  const [openConfirmation, setOpenConfirmation] = useState<boolean>(false)

  // Need to use ID from the summary since it is different from the currentNetworkId
  const id: IdType = summary.externalId

  // Get the network model from the store as fallback for node and edge counts
  const networkModels = useNetworkStore((state) => state.networks)
  const networkModel: Network | undefined = networkModels.get(id)

  // Prefer counts from summary, fallback to network model if available
  const nodeCount: number = summary.nodeCount ?? networkModel?.nodes.length ?? 0
  const edgeCount: number = summary.edgeCount ?? networkModel?.edges.length ?? 0

  const [editNetworkSummaryAnchorEl, setEditNetworkSummaryAnchorEl] = useState<
    HTMLButtonElement | undefined
  >(undefined)

  // Anchor of the overflow ("...") menu holding the save / edit / delete actions
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLButtonElement | null>(
    null,
  )

  const openMenu = (event: React.MouseEvent<HTMLButtonElement>): void => {
    // Opening the menu must not select / navigate to the network
    event.stopPropagation()
    setMenuAnchorEl(event.currentTarget)
  }

  const closeMenu = (): void => {
    setMenuAnchorEl(null)
  }

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

  // Anchored to the overflow menu button, which stays mounted after the menu closes
  const showEditNetworkSummaryForm = (anchorEl: HTMLButtonElement): void => {
    setEditNetworkSummaryAnchorEl(anchorEl)
  }

  const networkModified =
    useWorkspaceStore((state) => state.workspace.networkModified[id]) ?? false

  const client = useContext(KeycloakContext)
  const authenticated: boolean = client?.authenticated ?? false
  const saveCurrentNetworkToNDEx = useSaveCurrentNetworkToNDEx()

  const saveButtonState = getSaveButtonState({
    networkModified,
    isNdex: summary.isNdex,
    authenticated,
  })

  const saveMenuItemState = getSaveMenuItemState({
    saveAction: saveButtonState.action,
    isNdex: summary.isNdex,
    isCurrentNetwork: id === currentNetworkId,
  })

  const onClickSaveStatus = (e: React.MouseEvent<HTMLElement>): void => {
    e.stopPropagation()
    closeMenu()
    void saveCurrentNetworkToNDEx()
  }

  const { deleteNetwork } = useDeleteCyNetwork()

  const onClickDelete = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation()
    closeMenu()
    setLastOpenedNetworkId(currentNetworkId)
    setCurrentNetworkId(id)
    setOpenConfirmation(true)
  }

  const onConfirmDelete = () => {
    // Delete the network without automatic navigation
    deleteNetwork(id, { navigate: false })

    // Navigate back to the previously viewed network, same logic as onCancelDelete
    if (lastOpenedNetworkId !== '') {
      if (lastOpenedNetworkId !== id) {
        setCurrentNetworkId(lastOpenedNetworkId)
        navigateToNetwork({
          workspaceId: workspace.id,
          networkId: lastOpenedNetworkId,
          searchParams: new URLSearchParams(location.search),
          replace: true,
        })
      } else {
        // If the previous network was the one being deleted, navigate to first available or empty
        const remainingNetworks = workspace.networkIds.filter(
          (networkId) => networkId !== id,
        )
        const nextNetworkId = remainingNetworks[0] ?? ''

        if (nextNetworkId !== '') {
          setCurrentNetworkId(nextNetworkId)
          navigateToNetwork({
            workspaceId: workspace.id,
            networkId: nextNetworkId,
            searchParams: new URLSearchParams(location.search),
            replace: true,
          })
        } else {
          setCurrentNetworkId('')
          navigateToNetwork({
            workspaceId: workspace.id,
            networkId: '',
            searchParams: new URLSearchParams(location.search),
            replace: true,
          })
        }
      }
    } else {
      // If no previous network was set, navigate to first available or empty
      const remainingNetworks = workspace.networkIds.filter(
        (networkId) => networkId !== id,
      )
      const nextNetworkId = remainingNetworks[0] ?? ''

      if (nextNetworkId !== '') {
        setCurrentNetworkId(nextNetworkId)
        navigateToNetwork({
          workspaceId: workspace.id,
          networkId: nextNetworkId,
          searchParams: new URLSearchParams(location.search),
          replace: true,
        })
      } else {
        setCurrentNetworkId('')
        navigateToNetwork({
          workspaceId: workspace.id,
          networkId: '',
          searchParams: new URLSearchParams(location.search),
          replace: true,
        })
      }
    }
  }

  const onCancelDelete = () => {
    if (lastOpenedNetworkId !== '') {
      if (lastOpenedNetworkId !== id) {
        setCurrentNetworkId(lastOpenedNetworkId)
        navigateToNetwork({
          workspaceId: workspace.id,
          networkId: lastOpenedNetworkId,
          searchParams: new URLSearchParams(location.search),
          replace: true,
        })
      }
    } else {
      setCurrentNetworkId('')
      navigateToNetwork({
        workspaceId: workspace.id,
        networkId: '',
        searchParams: new URLSearchParams(location.search),
        replace: true,
      })
    }
  }

  /**
   * Single overflow button replacing the former save-status, edit and delete
   * buttons. Its menu holds those three actions, and a badge keeps the unsaved
   * state visible on the row without opening the menu.
   */
  const networkActionsMenuButton = (
    <Tooltip
      title={
        saveButtonState.upToDate
          ? 'Network actions'
          : 'Network actions (unsaved changes)'
      }
    >
      <IconButton
        data-testid="network-property-menu-button"
        size="small"
        sx={{ width: 24, height: 24 }}
        onClick={openMenu}
      >
        <Badge
          variant="dot"
          color="warning"
          overlap="circular"
          invisible={saveButtonState.upToDate}
          // data-* attributes are not part of MUI's badge slot props type
          slotProps={{
            badge: { 'data-testid': 'network-unsaved-badge' } as any,
          }}
          sx={{
            '& .MuiBadge-badge': {
              minWidth: 7,
              height: 7,
              top: 2,
              right: 2,
            },
          }}
        >
          <MoreVertIcon
            sx={{ fontSize: 18, color: theme.palette.text.primary }}
          />
        </Badge>
      </IconButton>
    </Tooltip>
  )

  const networkActionsMenu = (
    <Menu
      anchorEl={menuAnchorEl}
      open={menuAnchorEl !== null}
      onClose={closeMenu}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <MenuItem
        data-testid="network-save-status-menuitem"
        disabled={saveMenuItemState.disabled}
        onClick={onClickSaveStatus}
      >
        <ListItemIcon>
          {saveButtonState.upToDate ? (
            <CheckCircleIcon
              sx={{ color: theme.palette.success.main, fontSize: 18 }}
            />
          ) : (
            <CloudUploadIcon
              sx={{ color: theme.palette.warning.main, fontSize: 18 }}
            />
          )}
        </ListItemIcon>
        <ListItemText
          primary={saveMenuItemState.label}
          secondary={saveMenuItemState.hint}
        />
      </MenuItem>
      <MenuItem
        data-testid="network-property-edit-menuitem"
        onClick={(e) => {
          e.stopPropagation()
          const anchorEl = menuAnchorEl
          closeMenu()
          setCurrentNetworkId(id)
          navigateToNetwork({
            workspaceId: workspace.id,
            networkId: id,
            searchParams: new URLSearchParams(location.search),
            replace: false,
          })
          if (anchorEl !== null) {
            showEditNetworkSummaryForm(anchorEl)
          }
        }}
      >
        <ListItemIcon>
          <EditIcon sx={{ fontSize: 18, color: theme.palette.text.primary }} />
        </ListItemIcon>
        <ListItemText primary="Edit Network Properties" />
      </MenuItem>
      <MenuItem
        data-testid="network-property-delete-menuitem"
        onClick={onClickDelete}
      >
        <ListItemIcon>
          <DeleteIcon
            sx={{ fontSize: 18, color: theme.palette.text.primary }}
          />
        </ListItemIcon>
        <ListItemText primary="Remove the Network from Workspace" />
      </MenuItem>
    </Menu>
  )

  return (
    <>
      <Box
        sx={{
          backgroundColor: (theme) =>
            currentNetworkId === id
              ? theme.palette.action.selected
              : theme.palette.background.paper,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          '&:hover': { cursor: 'pointer' },
          p: 1,
          borderBottom: (theme) =>
            `2px solid ${theme.palette.background.default}`,
        }}
        onClick={() => {
          setCurrentNetworkId(id)
          navigateToNetwork({
            workspaceId: workspace.id,
            networkId: id,
            searchParams: new URLSearchParams(location.search),
            replace: false,
          })
        }}
      >
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 0.5,
          }}
        >
          <Box
            sx={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
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
                sx={{ opacity: 0.8 }}
                label={
                  <Typography sx={{ fontSize: 10 }} variant="caption">
                    {summary.isNdex ? 'NDEx' : 'Local'}
                  </Typography>
                }
              />
            </Tooltip>
            <Typography
              variant={'body2'}
              sx={{ flexGrow: 1, color: theme.palette.text.primary }}
            >
              {summary.name}
            </Typography>
            {networkActionsMenuButton}
          </Box>
          {summary.sourcePath && (
            <Tooltip
              title="Import path from NDEx. This location is a snapshot and may not reflect recent moves or folder changes in NDEx."
              placement="bottom-start"
            >
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  color: theme.palette.text.disabled,
                  ml: 0.5,
                  mb: 0.5,
                  fontSize: 10,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Imported from: {summary.sourcePath}
              </Typography>
            </Tooltip>
          )}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography
              variant={'body2'}
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
        <Suspense
          fallback={
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              minHeight="0"
              height="20px"
            >
              <CircularProgress size={16} />
            </Box>
          }
        >
          <NetworkPropertyEditor
            networkId={summary.externalId}
            anchorEl={editNetworkSummaryAnchorEl}
            onClose={hideEditNetworkSummaryForm}
          />
        </Suspense>
        <ConfirmationDialog
          title="Remove Network From Workspace"
          message={`Do you really want to delete the network "${summary.name}"?`}
          onCancel={onCancelDelete}
          onConfirm={onConfirmDelete}
          open={openConfirmation}
          setOpen={setOpenConfirmation}
          buttonTitle="Yes (cannot be undone)"
          isAlert
        />
      </Box>
      {/* Rendered outside the clickable row: React events from the menu's
          portal still bubble through the component tree */}
      {networkActionsMenu}
    </>
  )
}
