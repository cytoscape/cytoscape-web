import { MenuItem, Box, Tooltip } from '@mui/material'
import { ReactElement, useContext, useState } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'

import { useWorkspaceStore } from '../../../hooks/stores/WorkspaceStore'
import { useNetworkStore } from '../../../hooks/stores/NetworkStore'
import { useTableStore } from '../../../hooks/stores/TableStore'
import { useViewModelStore } from '../../../hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../../hooks/stores/VisualStyleStore'
import { useCredentialStore } from '../../../hooks/stores/CredentialStore'
import { useNetworkSummaryStore } from '../../../hooks/stores/NetworkSummaryStore'
import { Network } from '../../../models/NetworkModel'
import { IdType } from '../../../models/IdType'
import { AppConfigContext } from '../../../AppConfigContext'
import { useMessageStore } from '../../../hooks/stores/MessageStore'
import { KeycloakContext } from '../../../init/keycloak'
import { useHcxValidatorStore } from '../../HierarchyViewer/store/HcxValidatorStore'
import { HcxValidationSaveDialog } from '../../HierarchyViewer/components/Validation/HcxValidationSaveDialog'
import { NetworkView } from '../../../models/ViewModel'
import { useUiStateStore } from '../../../hooks/stores/UiStateStore'
import { useOpaqueAspectStore } from '../../../hooks/stores/OpaqueAspectStore'
import { TimeOutErrorIndicator, TimeOutErrorMessage } from '../../../api/ndex'
import { useSaveCyNetworkCopyToNDEx } from '../../../hooks/useSaveCyNetworkCopyToNDEx'
import { MessageSeverity } from '../../../models/MessageModel'
import { logUi } from '../../../debug'
import { useUrlNavigation } from '../../../hooks/navigation/useUrlNavigation'
import { useLoadNetworkSummaries } from '../../../hooks/useLoadNetworkSummaries'
import { NetworkSummary } from '../../../models'
import { waitSeconds } from '../../../utils/wait-seconds'

export const CopyNetworkToNDExMenuItem = (
  props: BaseMenuProps,
): ReactElement => {
  const { ndexBaseUrl } = useContext(AppConfigContext)
  const [showHcxValidationDialog, setShowHcxValidationDialog] =
    useState<boolean>(false)
  const { navigateToNetwork } = useUrlNavigation()
  const workspace = useWorkspaceStore((state) => state.workspace)

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

  const addSummary = useNetworkSummaryStore((state) => state.add)

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
  const addNetwork = useWorkspaceStore((state) => state.addNetworkIds)
  const saveNetworkCopy = useSaveCyNetworkCopyToNDEx()
  const loadNetworkSummaries = useLoadNetworkSummaries()
  const saveCopyToNDEx = async (): Promise<void> => {
    const accessToken = await getToken()

    try {
      const uuid = await saveNetworkCopy(
        accessToken,
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
      waitSeconds(1)
      const summaries = await loadNetworkSummaries(uuid as IdType, accessToken)

      waitSeconds(1)
      addSummary(uuid, summaries[uuid] as NetworkSummary)
      addNetwork(uuid)
      setCurrentNetworkId(uuid as IdType)
      navigateToNetwork({
        workspaceId: workspace.id,
        networkId: uuid as IdType,
        searchParams: new URLSearchParams(location.search),
        replace: false,
      })
      addMessage({
        message: `Saved a copy of the current network to NDEx with new uuid ${
          uuid as string
        }`,
        duration: 3000,
        severity: MessageSeverity.SUCCESS,
      })
    } catch (e) {
      logUi.error(
        `[${CopyNetworkToNDExMenuItem.name}]:[${saveCopyToNDEx.name}] Failed to save a copy of the current network to NDEx`,
        e,
      )
      if (e.message.includes(TimeOutErrorIndicator)) {
        addMessage({
          message: TimeOutErrorMessage,
          duration: 4000,
          severity: MessageSeverity.ERROR,
        })
      } else {
        addMessage({
          message: `Error: Could not save a copy of the current network to NDEx. ${
            e.message as string
          }`,
          duration: 4000,
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
