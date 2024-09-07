import React, { useState, useContext } from 'react'
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
} from '@mui/material'
import { BaseMenuProps } from '../BaseMenuProps'
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
import { saveAllNetworks } from '../../../utils/ndex-utils'

export const SaveWorkspaceToNDExMenuItem = (
  props: BaseMenuProps,
): React.ReactElement => {
  const { ndexBaseUrl } = useContext(AppConfigContext)
  const client = useContext(KeycloakContext)
  const getToken = useCredentialStore((state) => state.getToken)
  const authenticated: boolean = client?.authenticated ?? false
  const addMessage = useMessageStore((state) => state.addMessage)
  const setId = useWorkspaceStore((state) => state.setId)
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
      alert('Please enter a workspace name')
      return
    }
    try {
      await saveAllNetworks(
        getToken,
        allNetworkId,
        ndexBaseUrl,
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
      )
      const ndexClient = new NDEx(ndexBaseUrl)
      const accessToken = await getToken()
      ndexClient.setAuthToken(accessToken)

      const workspace = await getWorkspaceFromDb()
      const response = await ndexClient.createCyWebWorkspace({
        name: workspaceName,
        options: { currentNetwork: workspace.currentNetworkId },
        networkIDs: workspace.networkIds,
      })
      const { uuid, modificationTime } = response
      setId(uuid)
      renameWorkspace(workspaceName)

      console.log(modificationTime)

      addMessage({
        message: `Saved workspace to NDEx.`,
        duration: 3000,
      })
    } catch (e) {
      console.error(e)
      addMessage({
        message: `Error: Could not save workspace to NDEx. ${e.message as string}`,
        duration: 3000,
      })
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
      <DialogTitle>Save Workspace As...</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          id="name"
          label="Workspace Name"
          type="text"
          fullWidth
          variant="standard"
          value={workspaceName}
          onChange={handleNameChange}
          onKeyDown={(e) => {
            e.stopPropagation()
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseDialog}>Cancel</Button>
        <Button onClick={saveWorkspaceToNDEx}>Save</Button>
      </DialogActions>
    </Dialog>
  )

  const menuItem = (
    <MenuItem disabled={!authenticated} onClick={handleSaveWorkspaceToNDEx}>
      Save workspace as...
    </MenuItem>
  )

  return (
    <>
      {authenticated ? (
        menuItem
      ) : (
        <Tooltip title="Login to save a copy of the current network to NDEx">
          <Box>{menuItem}</Box>
        </Tooltip>
      )}
      {dialog}
    </>
  )
}
