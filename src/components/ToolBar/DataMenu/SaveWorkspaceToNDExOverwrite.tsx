import React, { useState, useContext, useEffect } from 'react'
import {
  MenuItem,
  Box,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material'
import { BaseMenuProps } from '../BaseMenuProps'
// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'
import { useCredentialStore } from '../../../store/CredentialStore'
import { AppConfigContext } from '../../../AppConfigContext'
import { useMessageStore } from '../../../store/MessageStore'
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
import { VisualStyleOptions } from 'src/models/VisualStyleModel/VisualStyleOptions'
import { useNdexNetwork } from '../../../store/hooks/useNdexNetwork'
import { NdexNetworkSummary, NetworkView, Table, VisualStyle } from 'src/models'

export const SaveWorkspaceToNDExOverwriteMenuItem = (
  props: BaseMenuProps,
): React.ReactElement => {
  const { ndexBaseUrl } = useContext(AppConfigContext)
  const client = useContext(KeycloakContext)
  const getToken = useCredentialStore((state) => state.getToken)
  const authenticated: boolean = client?.authenticated ?? false
  const addMessage = useMessageStore((state) => state.addMessage)

  const [openDialog, setOpenDialog] = useState<boolean>(false)
  const updateSummary = useNetworkSummaryStore((state) => state.update)
  const workspace = useWorkspaceStore((state) => state.workspace)
  const [hasWorkspace, setHasWorkspace] = useState(false)

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

  useEffect(() => {
    const fetchMyWorkspaces = async (): Promise<any> => {
      const ndexClient = new NDEx(ndexBaseUrl)
      const token = await getToken()
      ndexClient.setAuthToken(token)
      const myWorkspaces = await ndexClient.getUserCyWebWorkspaces()
      return myWorkspaces
    }
    if (authenticated) {
      fetchMyWorkspaces()
        .then(function (resultArray) {
          const workspaceIds = resultArray.map(
            (item: { workspaceId: any }) => item.workspaceId,
          )
          const savedWorkspace = workspaceIds.includes(workspace.id)
          setHasWorkspace(savedWorkspace)
        })
        .catch(function (error) {
          console.error('Error:', error)
        })
    }
  }, [])

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
    const { uuid } = await ndexClient.createNetworkFromRawCX2(cx)
    addNetworkToWorkspace(uuid as IdType)
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
      }
      if (summary.isNdex === false) {
        await saveCopyToNDEx(
          network,
          visualStyle,
          summary,
          nodeTable,
          edgeTable,
          networkViews?.[0],
          visualStyleOptions,
        )
        continue
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
            addMessage({
              message: `Unable to save the modified network to NDEx. Instead, saved its copy to NDEx. Error: ${e.message as string}`,
              duration: 3000,
            })
          } catch (e) {
            addMessage({
              message: `Unable to save the network or its copy to NDEx. Error: ${e.message as string}`,
              duration: 3000,
            })
            throw e
          }
        }
      }
    }
  }

  const saveWorkspaceToNDEx = async (): Promise<void> => {
    try {
      await saveAllNetworks()
      const ndexClient = new NDEx(ndexBaseUrl)
      const accessToken = await getToken()
      ndexClient.setAuthToken(accessToken)

      const update = await ndexClient.updateCyWebWorkspace(workspace.id, {
        name: workspace.name,
        options: { currentNetwork: workspace.currentNetworkId },
        networkIDs: workspace.networkIds,
      })
      console.log(update)

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

  const handleSaveCurrentNetworkToNDEx = async (): Promise<void> => {
    handleOpenDialog()
  }

  const dialog = (
    <Dialog open={openDialog} onClose={handleCloseDialog}>
      <DialogTitle>
        Do you want to save (overwrite) the current workspace?
      </DialogTitle>
      <DialogContent></DialogContent>
      <DialogActions>
        <Button onClick={handleCloseDialog}>Cancel</Button>
        <Tooltip
          arrow={true}
          placement="top"
          title={
            hasWorkspace
              ? ''
              : "Current workspace does not exist on this account, please use 'Save workspace as...' first."
          }
        >
          <Box>
            <Button disabled={!hasWorkspace} onClick={saveWorkspaceToNDEx}>
              Save
            </Button>
          </Box>
        </Tooltip>
      </DialogActions>
    </Dialog>
  )

  const menuItem = (
    <MenuItem
      disabled={!authenticated}
      onClick={handleSaveCurrentNetworkToNDEx}
    >
      Save workspace
    </MenuItem>
  )

  return (
    <>
      {authenticated ? (
        menuItem
      ) : (
        <Tooltip title="Login to save the current network in NDEx">
          <Box>{menuItem}</Box>
        </Tooltip>
      )}
      {dialog}
    </>
  )
}
