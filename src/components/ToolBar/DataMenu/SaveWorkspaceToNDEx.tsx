import React, { useState, useContext, useEffect } from 'react'
import {
  MenuItem,
  Box,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
} from '@mui/material'
import { WorkspaceMenuProps } from '../BaseMenuProps'
// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'
import { useCredentialStore } from '../../../store/CredentialStore'
import { AppConfigContext } from '../../../AppConfigContext'
import { useMessageStore } from '../../../store/MessageStore'
import { getWorkspaceFromDb } from '../../../store/persist/db'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { useNetworkSummaryStore } from '../../../store/NetworkSummaryStore'
import { useVisualStyleStore } from '../../../store/VisualStyleStore'
import { useNetworkStore } from '../../../store/NetworkStore'
import { useTableStore } from '../../../store/TableStore'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { KeycloakContext } from '../../../bootstrap'
import { useUiStateStore } from '../../../store/UiStateStore'
import {
  NdexDuplicateKeyErrorMessage,
  saveAllNetworks,
} from '../../../utils/ndex-utils'
import { useOpaqueAspectStore } from '../../../store/OpaqueAspectStore'

export const SaveWorkspaceToNDExMenuItem = (
  props: WorkspaceMenuProps,
): React.ReactElement => {
  const [warningMessage, setWarningMessage] = useState<string>('')
  const [showWarning, setShowWarning] = useState<boolean>(false)
  const existingWorkspaceNames = props.existingWorkspace.map(
    (workspace) => workspace.name,
  )
  const { ndexBaseUrl } = useContext(AppConfigContext)
  const client = useContext(KeycloakContext)
  const getToken = useCredentialStore((state) => state.getToken)
  const authenticated: boolean = client?.authenticated ?? false
  const addMessage = useMessageStore((state) => state.addMessage)
  const setId = useWorkspaceStore((state) => state.setId)
  const currentWorkspaceId = useWorkspaceStore((state) => state.workspace.id)
  const renameWorkspace = useWorkspaceStore((state) => state.setName)
  // data from store
  const networkModifiedStatus = useWorkspaceStore(
    (state) => state.workspace.networkModified,
  )
  const deleteNetworkModifiedStatus = useWorkspaceStore(
    (state) => state.deleteNetworkModifiedStatus,
  )
  const networks = useNetworkStore((state) => state.networks)
  const visualStyles = useVisualStyleStore((state) => state.visualStyles)
  const summaries = useNetworkSummaryStore((state) => state.summaries)
  const tables = useTableStore((state) => state.tables)
  const viewModels = useViewModelStore((state) => state.viewModels)
  const networkVisualStyleOpt = useUiStateStore(
    (state) => state.ui.visualStyleOptions,
  )
  const opaqueAspects = useOpaqueAspectStore((state) => state.opaqueAspects)

  const [workspaceName, setWorkspaceName] = useState<string>('')
  const [openDialog, setOpenDialog] = useState<boolean>(false)
  const updateSummary = useNetworkSummaryStore((state) => state.update)

  const handleOpenDialog = (): void => {
    setOpenDialog(true)
  }

  const handleCloseDialog = (): void => {
    setOpenDialog(false)
    props.handleClose()
  }

  const allNetworkId = useWorkspaceStore((state) => state.workspace.networkIds)

  const handleNameChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    setWorkspaceName(event.target.value)
  }

  const addNetworkToWorkspace = useWorkspaceStore(
    (state) => state.addNetworkIds,
  )

  const saveWorkspaceToNDEx = async (): Promise<void> => {
    if (workspaceName.trim().length === 0) {
      setWarningMessage('Please enter a workspace name')
      setShowWarning(true)
      return
    }
    if (existingWorkspaceNames.includes(workspaceName)) {
      setWarningMessage(
        'This workspace name already exists. Please enter a unique workspace name',
      )
      setShowWarning(true)
      return
    }
    try {
      const accessToken = await getToken()
      const ndexClient = new NDEx(ndexBaseUrl)
      ndexClient.setAuthToken(accessToken)

      await saveAllNetworks(
        accessToken,
        ndexBaseUrl,
        ndexClient,
        allNetworkId,
        addNetworkToWorkspace,
        networkModifiedStatus,
        updateSummary,
        deleteNetworkModifiedStatus,
        addMessage,
        networks,
        visualStyles,
        summaries,
        tables,
        viewModels,
        networkVisualStyleOpt,
        opaqueAspects,
      )

      const workspace = await getWorkspaceFromDb(currentWorkspaceId)
      const onlyNdexNetworkIds = workspace.networkIds.filter(id => summaries[id]?.isNdex ===true);
      const response = await ndexClient.createCyWebWorkspace({
        name: workspaceName,
        options: { currentNetwork: workspace.currentNetworkId },
        networkIDs: onlyNdexNetworkIds,
      })
      const { uuid, modificationTime } = response
      setId(uuid)
      renameWorkspace(workspaceName)

      addMessage({
        message: `Saved workspace to NDEx successfully.`,
        duration: 3000,
      })
    } catch (e) {
      if (e.response?.data?.message?.includes(NdexDuplicateKeyErrorMessage)) {
        addMessage({
          message:
            'This workspace name already exists. Please enter a unique workspace name',
          duration: 5000,
        })
      } else {
        addMessage({
          message: `Error: Could not save workspace to NDEx.`,
          duration: 5000,
        })
      }
    }

    handleCloseDialog()
    props.handleClose()
  }

  const handleSaveWorkspaceToNDEx = async (): Promise<void> => {
    handleOpenDialog()
  }

  const dialog = (
    <Dialog
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
      }}
      onKeyDown={(e) => {
        e.stopPropagation()
      }}
      open={openDialog}
      onClose={handleCloseDialog}
    >
      <DialogTitle>Save Workspace as...</DialogTitle>
      <DialogContent sx={{ width: '300px' }}>
        <TextField
          autoFocus
          id="name"
          label="Unique Workspace Name"
          type="text"
          fullWidth
          variant="standard"
          value={workspaceName}
          onChange={handleNameChange}
          onKeyDown={(e) => {
            e.stopPropagation()
            setShowWarning(false)
          }}
        />
        {showWarning && (
          <Typography color="error" variant="body2">
            {warningMessage}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseDialog} color="primary">
          Cancel
        </Button>
        <Button
          onClick={saveWorkspaceToNDEx}
          sx={{
            color: '#FFFFFF',
            backgroundColor: '#337ab7',
            '&:hover': {
              backgroundColor: '#285a9b',
            },
            '&:disabled': {
              backgroundColor: 'transparent',
            },
          }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )

  const menuItem = (
    <MenuItem disabled={!authenticated} onClick={handleSaveWorkspaceToNDEx}>
      Save Workspace As...
    </MenuItem>
  )

  return (
    <>
      {authenticated ? (
        menuItem
      ) : (
        <Tooltip title="Login to save a copy of the current workspace to NDEx">
          <Box>{menuItem}</Box>
        </Tooltip>
      )}
      {dialog}
    </>
  )
}
