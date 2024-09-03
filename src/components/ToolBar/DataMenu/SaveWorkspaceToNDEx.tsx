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
import { exportNetworkToCx2 } from '../../../store/io/exportCX'
import { useNetworkSummaryStore } from '../../../store/NetworkSummaryStore'
import { useVisualStyleStore } from '../../../store/VisualStyleStore'
import { useNetworkStore } from '../../../store/NetworkStore'
import { useTableStore } from '../../../store/TableStore'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { Network } from '../../../models/NetworkModel'
import { IdType } from '../../../models/IdType'
import { KeycloakContext } from '../../../bootstrap'
import { useUiStateStore } from '../../../store/UiStateStore'
import { NdexNetworkSummary, NetworkView, Table, VisualStyle } from 'src/models'
import { VisualStyleOptions } from '../../../models/VisualStyleModel/VisualStyleOptions'
import { useNdexNetwork } from '../../../store/hooks/useNdexNetwork'

export const SaveWorkspaceToNDExMenuItem = (
  props: BaseMenuProps,
): React.ReactElement => {
  const { ndexBaseUrl } = useContext(AppConfigContext)
  const client = useContext(KeycloakContext)
  const getToken = useCredentialStore((state) => state.getToken)
  const authenticated: boolean = client?.authenticated ?? false
  const addMessage = useMessageStore((state) => state.addMessage)
  const setId = useWorkspaceStore((state) => state.setId)

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

  const saveNetworkToNDEx = async (
    networkId: string,
    network: Network,
    visualStyle: VisualStyle,
    summary: NdexNetworkSummary,
    nodeTable: Table,
    edgeTable: Table,
    viewModel: NetworkView,
    visualStyleOptions?: VisualStyleOptions,
  ): Promise<void> => {
    const ndexClient = new NDEx(ndexBaseUrl)
    const accessToken = await getToken()

    ndexClient.setAuthToken(accessToken)
    const cx = exportNetworkToCx2(
      network,
      visualStyle,
      summary,
      nodeTable,
      edgeTable,
      visualStyleOptions,
      viewModel,
    )

    await ndexClient.updateNetworkFromRawCX2(networkId, cx)
    const ndexSummary = await ndexClient.getNetworkSummary(networkId)
    const newNdexModificationTime = ndexSummary.modificationTime
    updateSummary(networkId, {
      modificationTime: newNdexModificationTime,
    })
  }

  const saveCopyToNDEx = async (
    network: Network,
    visualStyle: VisualStyle,
    summary: NdexNetworkSummary,
    nodeTable: Table,
    edgeTable: Table,
    viewModel: NetworkView,
    visualStyleOptions?: VisualStyleOptions,
  ): Promise<void> => {
    const ndexClient = new NDEx(ndexBaseUrl)
    const accessToken = await getToken()
    ndexClient.setAuthToken(accessToken)

    const cx = exportNetworkToCx2(
      network,
      visualStyle,
      summary,
      nodeTable,
      edgeTable,
      visualStyleOptions,
      viewModel,
      `Copy of ${summary.name}`,
    )

    try {
      const { uuid } = await ndexClient.createNetworkFromRawCX2(cx)
      addNetworkToWorkspace(uuid as IdType)

      addMessage({
        message: `Saved a copy of the current network to NDEx with new uuid ${
          uuid as string
        }`,
        duration: 3000,
      })
    } catch (e) {
      console.log(e)
      addMessage({
        message: `Error: Could not save a copy of the current network to NDEx. ${
          e.message as string
        }`,
        duration: 3000,
      })
    }
  }

  const saveAllNetworks = async (): Promise<void> => {
    for (const networkId of allNetworkId) {
      let network = networks.get(networkId) as Network
      let visualStyle = visualStyles[networkId]
      const summary = summaries[networkId]
      let nodeTable = tables[networkId]?.nodeTable
      let edgeTable = tables[networkId]?.edgeTable
      let networkViews: NetworkView[] = viewModels[networkId]
      let visualStyleOptions: VisualStyleOptions | undefined =
        networkVisualStyleOpt[networkId]

      if (!network || !visualStyle || !nodeTable || !edgeTable) {
        const currentToken = await getToken()
        try {
          const res = await useNdexNetwork(networkId, ndexBaseUrl, currentToken)
          // Using parentheses to perform destructuring assignment correctly
          ;({
            network,
            nodeTable,
            edgeTable,
            visualStyle,
            networkViews,
            visualStyleOptions,
          } = res)
        } catch (error) {
          console.error('Failed to update network details:', error)
        }
      }

      if (networkModifiedStatus[networkId] === true) {
        try {
          await saveNetworkToNDEx(
            networkId,
            network,
            visualStyle,
            summary,
            nodeTable,
            edgeTable,
            networkViews?.[0],
            visualStyleOptions,
          )
          deleteNetworkModifiedStatus(networkId)
        } catch (e) {
          console.error(e)
          try {
            await saveCopyToNDEx(
              network,
              visualStyle,
              summary,
              nodeTable,
              edgeTable,
              networkViews?.[0],
              visualStyleOptions,
            )
          } catch (e) {
            console.error(e)
          }
        }
      }
    }
  }

  const saveWorkspaceToNDEx = async (): Promise<void> => {
    if (workspaceName.trim().length === 0) {
      alert('Please enter a workspace name')
      return
    }
    await saveAllNetworks()
    const ndexClient = new NDEx(ndexBaseUrl)
    const accessToken = await getToken()
    ndexClient.setAuthToken(accessToken)

    try {
      const workspace = await getWorkspaceFromDb()
      const response = await ndexClient.createCyWebWorkspace({
        name: workspaceName,
        options: { currentNetwork: workspace.currentNetworkId },
        networkIDs: workspace.networkIds,
      })
      const { uuid, modificationTime } = response
      setId(uuid)

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
