import React, { useState, useContext, useEffect } from 'react'
import { MenuItem, Box, Tooltip } from '@mui/material'
import { WorkspaceMenuProps } from '../BaseMenuProps'
// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'
import { useCredentialStore } from '../../../store/CredentialStore'
import { getWorkspaceFromDb } from '../../../store/persist/db'
import { AppConfigContext } from '../../../AppConfigContext'
import { useMessageStore } from '../../../store/MessageStore'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { useNetworkSummaryStore } from '../../../store/NetworkSummaryStore'
import { useVisualStyleStore } from '../../../store/VisualStyleStore'
import { useNetworkStore } from '../../../store/NetworkStore'
import { useTableStore } from '../../../store/TableStore'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { KeycloakContext } from '../../../bootstrap'
import { useUiStateStore } from '../../../store/UiStateStore'
import {
  saveAllNetworks,
  NdexDuplicateKeyErrorMessage,
} from '../../../utils/ndex-utils'
import { ConfirmationDialog } from '../../Util/ConfirmationDialog'
import { useOpaqueAspectStore } from '../../../store/OpaqueAspectStore'

export const SaveWorkspaceToNDExOverwriteMenuItem = (
  props: WorkspaceMenuProps,
): React.ReactElement => {
  const { ndexBaseUrl } = useContext(AppConfigContext)
  const client = useContext(KeycloakContext)
  const getToken = useCredentialStore((state) => state.getToken)
  const authenticated: boolean = client?.authenticated ?? false
  const addMessage = useMessageStore((state) => state.addMessage)
  const [openDialog, setOpenDialog] = useState<boolean>(false)
  const updateSummary = useNetworkSummaryStore((state) => state.update)
  const setId = useWorkspaceStore((state) => state.setId)
  const currentWorkspaceId = useWorkspaceStore((state) => state.workspace.id)
  const hasWorkspace = props.existingWorkspace
    .map((workspace) => workspace.workspaceId)
    .includes(currentWorkspaceId)

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

  const handleOpenDialog = (): void => {
    setOpenDialog(true)
  }

  const handleCloseDialog = (): void => {
    setOpenDialog(false)
  }
  const allNetworkId = useWorkspaceStore((state) => state.workspace.networkIds)

  const addNetworkToWorkspace = useWorkspaceStore(
    (state) => state.addNetworkIds,
  )

  const opaqueAspects = useOpaqueAspectStore((state) => state.opaqueAspects)

  const saveWorkspaceToNDEx = async (): Promise<void> => {
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
      if (hasWorkspace) {
        await ndexClient.updateCyWebWorkspace(workspace.id, {
          name: workspace.name,
          options: { currentNetwork: workspace.currentNetworkId },
          networkIDs: onlyNdexNetworkIds,
        })
      } else {
        const response = await ndexClient.createCyWebWorkspace({
          name: workspace.name,
          options: { currentNetwork: workspace.currentNetworkId },
          networkIDs: workspace.networkIds,
        })
        const { uuid, modificationTime } = response
        setId(uuid)
      }

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

  const handleSaveCurrentNetworkToNDEx = async (): Promise<void> => {
    handleOpenDialog()
  }

  const menuItem = (
    <MenuItem
      disabled={!authenticated}
      onClick={handleSaveCurrentNetworkToNDEx}
    >
      Save Workspace
    </MenuItem>
  )

  return (
    <>
      {authenticated ? (
        menuItem
      ) : (
        <Tooltip title="Login to save/overwrite the current workspace to NDEx">
          <Box>{menuItem}</Box>
        </Tooltip>
      )}
      <ConfirmationDialog
        title="Save Workspace to NDEx"
        message="Do you want to save/overwrite the current workspace to NDEx?"
        onConfirm={saveWorkspaceToNDEx}
        open={openDialog}
        setOpen={setOpenDialog}
        buttonTitle="Save"
        isAlert={true}
      />
    </>
  )
}
