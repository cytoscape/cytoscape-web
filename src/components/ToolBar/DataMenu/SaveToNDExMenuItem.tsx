import {
  MenuItem,
  Box,
  Tooltip,
  Dialog,
  Button,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material'
import { ReactElement, useContext, useState } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'

// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'

import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { useNetworkStore } from '../../../store/NetworkStore'
import { useTableStore } from '../../../store/TableStore'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { useVisualStyleStore } from '../../../store/VisualStyleStore'
import { useCredentialStore } from '../../../store/CredentialStore'
import { useNetworkSummaryStore } from '../../../store/NetworkSummaryStore'
import { exportNetworkToCx2 } from '../../../store/exportCX'
import { Network } from '../../../models/NetworkModel'
import { AppConfigContext } from '../../../AppConfigContext'
import { IdType } from '../../../models/IdType'

export const SaveToNDExMenuItem = (props: BaseMenuProps): ReactElement => {
  const { ndexBaseUrl } = useContext(AppConfigContext)
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false)

  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const table = useTableStore((state) => state.tables[currentNetworkId])

  const summary = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId],
  )

  const updateSummary = useNetworkSummaryStore((state) => state.update)

  const viewModel = useViewModelStore(
    (state) => state.viewModels[currentNetworkId],
  )
  const visualStyle = useVisualStyleStore(
    (state) => state.visualStyles[currentNetworkId],
  )
  const network = useNetworkStore((state) =>
    state.networks.get(currentNetworkId),
  ) as Network

  const addNetworkToWorkspace = useWorkspaceStore(
    (state) => state.addNetworkIds,
  )
  const setCurrentNetworkId = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )

  const getToken = useCredentialStore((state) => state.getToken)
  const client = useCredentialStore((state) => state.client)
  const authenticated: boolean = client?.authenticated ?? false

  const overwriteNDExNetwork = async (): Promise<void> => {
    const ndexClient = new NDEx(`${ndexBaseUrl}/v2`)
    const accessToken = await getToken()
    ndexClient.setAuthToken(accessToken)
    const cx = exportNetworkToCx2(
      network,
      visualStyle,
      summary,
      table.nodeTable,
      table.edgeTable,
      viewModel,
    )

    // overwrite the current network on NDEx
    await ndexClient.updateNetworkFromRawCX2(currentNetworkId, cx)

    // update the network summary with the newest modification time
    const ndexSummary = await ndexClient.getNetworkSummary(currentNetworkId)
    const newNdexModificationTime = ndexSummary.modificationTime
    updateSummary(currentNetworkId, {
      modificationTime: newNdexModificationTime,
    })

    setShowConfirmDialog(false)
    props.handleClose()
  }

  const saveCopyToNDEx = async (): Promise<void> => {
    const ndexClient = new NDEx(`${ndexBaseUrl}/v2`)
    const accessToken = await getToken()
    ndexClient.setAuthToken(accessToken)
    const cx = exportNetworkToCx2(
      network,
      visualStyle,
      summary,
      table.nodeTable,
      table.edgeTable,
      viewModel,
    )

    try {
      const { uuid } = await ndexClient.createNetworkFromRawCX2(cx)
      const ndexSummary = await ndexClient.getNetworkSummary(uuid)
      const newNdexModificationTime = ndexSummary.modificationTime
      updateSummary(currentNetworkId, {
        modificationTime: newNdexModificationTime,
      })

      addNetworkToWorkspace(uuid as IdType)
      setTimeout(() => {
        setCurrentNetworkId(uuid as IdType)
      }, 200)

      console.log(
        `Saved a copy of the current network to NDEx with new uuid ${
          uuid as string
        }`,
      )
    } catch (e) {
      console.log(e)
    }

    setShowConfirmDialog(false)
    props.handleClose()
  }

  const handleSaveCurrentNetworkToNDEx = async (): Promise<void> => {
    const localModificationTime = summary.modificationTime
    const ndexClient = new NDEx(`${ndexBaseUrl}/v2`)
    const accessToken = await getToken()
    ndexClient.setAuthToken(accessToken)

    const ndexSummary = await ndexClient.getNetworkSummary(currentNetworkId)
    const ndexModificationTime = ndexSummary.modificationTime

    if (ndexModificationTime > localModificationTime) {
      setShowConfirmDialog(true)
    } else {
      await overwriteNDExNetwork()
    }
  }

  const menuItem = (
    <MenuItem
      disabled={!authenticated}
      onClick={handleSaveCurrentNetworkToNDEx}
    >
      Save current network to NDEx
    </MenuItem>
  )

  const dialog = (
    <Dialog
      onClose={() => {
        setShowConfirmDialog(false)
        props.handleClose()
      }}
      open={showConfirmDialog}
    >
      <DialogTitle>Networks out of sync</DialogTitle>
      <DialogContent>
        <DialogContentText>
          The network on NDEx has been modified since the last time you saved it
          from Cytoscape Web. Do you want to create a new copy of this network
          on NDEx instead?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={saveCopyToNDEx}>Yes, create copy to NDEx</Button>
        <Button onClick={overwriteNDExNetwork} color="error">
          No, overwrite the network in NDEx
        </Button>
      </DialogActions>
    </Dialog>
  )

  if (authenticated) {
    return (
      <>
        {menuItem}
        {dialog}
      </>
    )
  } else {
    return (
      <Tooltip title="Login to save network to NDEx">
        <Box>{menuItem}</Box>
      </Tooltip>
    )
  }
}
