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
import { exportNetworkToCx2 } from '../../../store/io/exportCX'
import { Network } from '../../../models/NetworkModel'
import { AppConfigContext } from '../../../AppConfigContext'
import { IdType } from '../../../models/IdType'
import { useMessageStore } from '../../../store/MessageStore'
import { KeycloakContext } from '../../..'
import { useHcxValidatorStore } from '../../../features/HierarchyViewer/store/HcxValidatorStore'
import { HcxValidationSaveDialog } from '../../../features/HierarchyViewer/components/Validation/HcxValidationSaveDialog'
import { NetworkView } from '../../../models/ViewModel'

export const SaveToNDExMenuItem = (props: BaseMenuProps): ReactElement => {
  const { ndexBaseUrl } = useContext(AppConfigContext)
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false)
  const [showHcxValidationDialog, setShowHcxValidationDialog] =
    useState<boolean>(false)

  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const table = useTableStore((state) => state.tables[currentNetworkId])

  const summary = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId],
  )

  const updateSummary = useNetworkSummaryStore((state) => state.update)

  const viewModel: NetworkView | undefined = useViewModelStore((state) =>
    state.getViewModel(currentNetworkId),
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

  const setNetworkModified = useWorkspaceStore(
    (state) => state.setNetworkModified,
  )
  const validationResults = useHcxValidatorStore(
    (state) => state.validationResults,
  )

  const client = useContext(KeycloakContext)

  const getToken = useCredentialStore((state) => state.getToken)
  const authenticated: boolean = client?.authenticated ?? false
  const addMessage = useMessageStore((state) => state.addMessage)

  const overwriteNDExNetwork = async (): Promise<void> => {
    if (viewModel === undefined) {
      throw new Error('Could not find the current network view model.')
    }

    const ndexClient = new NDEx(ndexBaseUrl)
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

    setNetworkModified(currentNetworkId, false)
    setCurrentNetworkId(currentNetworkId)

    setShowConfirmDialog(false)
    props.handleClose()
  }

  const saveCopyToNDEx = async (): Promise<void> => {
    if (viewModel === undefined) {
      throw new Error('Could not find the current network view model.')
    }
    const ndexClient = new NDEx(ndexBaseUrl)
    const accessToken = await getToken()
    ndexClient.setAuthToken(accessToken)
    const cx = exportNetworkToCx2(
      network,
      visualStyle,
      summary,
      table.nodeTable,
      table.edgeTable,
      viewModel,
      `Copy of ${summary.name}`,
    )

    try {
      const { uuid } = await ndexClient.createNetworkFromRawCX2(cx)
      addNetworkToWorkspace(uuid as IdType)
      setCurrentNetworkId(uuid as IdType)

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

    setShowConfirmDialog(false)
    props.handleClose()
  }

  const handleClick = async (): Promise<void> => {
    const validationResult = validationResults?.[currentNetworkId]

    if (validationResult !== undefined && !validationResult.isValid) {
      setShowHcxValidationDialog(true)
    } else {
      await handleSaveCurrentNetworkToNDEx()
    }
  }

  const handleSaveCurrentNetworkToNDEx = async (): Promise<void> => {
    const localModificationTime = summary.modificationTime
    const ndexClient = new NDEx(ndexBaseUrl)
    const accessToken = await getToken()
    ndexClient.setAuthToken(accessToken)

    const ndexSummary = await ndexClient.getNetworkSummary(currentNetworkId)
    const ndexModificationTime = ndexSummary.modificationTime

    if (ndexModificationTime > localModificationTime) {
      setShowConfirmDialog(true)
    } else {
      try {
        await overwriteNDExNetwork()

        addMessage({
          message: `Saved network to NDEx`,
          duration: 3000,
        })
      } catch (e) {
        console.log(e)

        addMessage({
          message: `Error: Could not overwrite the current network to NDEx. ${
            e.message as string
          }`,
          duration: 3000,
        })
      }
    }
  }

  const menuItem = (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <MenuItem
        sx={{ flexBasis: '100%', flexGrow: 3 }}
        disabled={!authenticated || !summary?.isNdex}
        onClick={handleClick}
      >
        Save the current network to NDEx (overwrite)
      </MenuItem>
    </Box>
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
        <HcxValidationSaveDialog
          open={showHcxValidationDialog}
          onClose={() => setShowHcxValidationDialog(false)}
          onSubmit={() => handleSaveCurrentNetworkToNDEx()}
          validationResult={validationResults?.[currentNetworkId]}
        />
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
