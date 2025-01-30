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
import { Network } from '../../../models/NetworkModel'
import { IdType } from '../../../models/IdType'
import { AppConfigContext } from '../../../AppConfigContext'
import { useMessageStore } from '../../../store/MessageStore'
import { KeycloakContext } from '../../../bootstrap'
import { useHcxValidatorStore } from '../../../features/HierarchyViewer/store/HcxValidatorStore'
import { HcxValidationSaveDialog } from '../../../features/HierarchyViewer/components/Validation/HcxValidationSaveDialog'
import { NetworkView } from '../../../models/ViewModel'
import { useUiStateStore } from '../../../store/UiStateStore'
import { useOpaqueAspectStore } from '../../../store/OpaqueAspectStore'
import {
  useSaveCopyToNDEx,
  TimeOutErrorIndicator,
  TimeOutErrorMessage,
} from '../../../utils/ndex-utils'
import { MessageSeverity } from '../../../models/MessageModel'

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
  const visualStyleOptions = useUiStateStore(
    (state) => state.ui.visualStyleOptions[currentNetworkId],
  )
  const network = useNetworkStore((state) =>
    state.networks.get(currentNetworkId),
  ) as Network

  const opaqueAspects = useOpaqueAspectStore(
    (state) => state.opaqueAspects[currentNetworkId],
  )

  const getToken = useCredentialStore((state) => state.getToken)
  const authenticated: boolean = client?.authenticated ?? false

  const addMessage = useMessageStore((state) => state.addMessage)

  const setCurrentNetworkId = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )
  const saveNetworkCopy = useSaveCopyToNDEx()
  const saveCopyToNDEx = async (): Promise<void> => {
    const ndexClient = new NDEx(ndexBaseUrl)
    const accessToken = await getToken()
    ndexClient.setAuthToken(accessToken)

    try {
      const uuid = await saveNetworkCopy(
        ndexBaseUrl,
        accessToken,
        ndexClient,
        network,
        visualStyle,
        summary,
        table.nodeTable,
        table.edgeTable,
        viewModel,
        visualStyleOptions,
        opaqueAspects,
        false, // keep the original network
      )
      setCurrentNetworkId(uuid as IdType)
      addMessage({
        message: `Saved a copy of the current network to NDEx with new uuid ${
          uuid as string
        }`,
        duration: 3000,
        severity: MessageSeverity.SUCCESS,
      })
    } catch (e) {
      console.log(e)
      if (e.message.includes(TimeOutErrorIndicator)) {
        addMessage({
          message: TimeOutErrorMessage,
          duration: 6000,
          severity: MessageSeverity.ERROR,
        })
      } else {
        addMessage({
          message: `Error: Could not save a copy of the current network to NDEx. ${
            e.message as string
          }`,
          duration: 5000,
          severity: MessageSeverity.ERROR,
        })
      }
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

  const enabled = authenticated && currentNetworkId !== ''
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
        disabled={!enabled}
        onClick={handleClick}
      >
        Save Copy to NDEx
      </MenuItem>
    </Box>
  )

  if (enabled) {
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
      <Tooltip
        arrow
        placement="right"
        title={
          currentNetworkId !== ''
            ? 'Login to save a copy of the current network to NDEx'
            : ''
        }
      >
        {menuItem}
      </Tooltip>
    )
  }
}
