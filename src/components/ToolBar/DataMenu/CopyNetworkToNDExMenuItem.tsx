import { MenuItem, Box, Tooltip } from '@mui/material'
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
import { IdType } from '../../../models/IdType'
import { AppConfigContext } from '../../../AppConfigContext'
import { useMessageStore } from '../../../store/MessageStore'
import { KeycloakContext } from '../../..'
import { useHcxValidatorStore } from '../../../features/HierarchyViewer/store/HcxValidatorStore'
import { HcxValidationSaveDialog } from '../../../features/HierarchyViewer/components/Validation/HcxValidationSaveDialog'
import { NetworkView } from '../../../models/ViewModel'

export const CopyNetworkToNDExMenuItem = (
  props: BaseMenuProps,
): ReactElement => {
  const { ndexBaseUrl } = useContext(AppConfigContext)
  const [showHcxValidationDialog, setShowHcxValidationDialog] =
    useState<boolean>(false)

  const validationResults = useHcxValidatorStore(
    (state) => state.validationResults,
  )

  const client = useContext(KeycloakContext)

  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const table = useTableStore((state) => state.tables[currentNetworkId])

  const summary = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId],
  )

  const viewModel: NetworkView | undefined = useViewModelStore((state) =>
    state.getViewModel(currentNetworkId),
  )
  const visualStyle = useVisualStyleStore(
    (state) => state.visualStyles[currentNetworkId],
  )
  const network = useNetworkStore((state) =>
    state.networks.get(currentNetworkId),
  ) as Network

  const getToken = useCredentialStore((state) => state.getToken)
  const authenticated: boolean = client?.authenticated ?? false

  const addMessage = useMessageStore((state) => state.addMessage)

  const addNetworkToWorkspace = useWorkspaceStore(
    (state) => state.addNetworkIds,
  )
  const setCurrentNetworkId = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )
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
      summary.isNdex ? `Copy of ${summary.name}` : summary.name,
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

    props.handleClose()
  }

  const handleSaveCurrentNetworkToNDEx = async (): Promise<void> => {
    await saveCopyToNDEx()
  }

  const handleClick = async (): Promise<void> => {
    const validationResult = validationResults?.[currentNetworkId]

    if (validationResult !== undefined && !validationResult.isValid) {
      setShowHcxValidationDialog(true)
    } else {
      await handleSaveCurrentNetworkToNDEx()
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
        disabled={!authenticated}
        onClick={handleClick}
      >
        {summary?.isNdex ? `Save Copy to NDEx` : `Save to NDEx`}
      </MenuItem>
    </Box>
  )

  if (authenticated) {
    return (
      <>
        {menuItem}
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
      <Tooltip title="Login to save a copy of the current network to NDEx">
        <Box>{menuItem}</Box>
      </Tooltip>
    )
  }
}
