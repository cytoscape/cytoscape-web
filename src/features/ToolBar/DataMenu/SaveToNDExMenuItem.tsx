import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  Tooltip,
} from '@mui/material'
import { ReactElement, useContext, useEffect, useState } from 'react'

import {
  fetchNdexSummaries,
  hasNdexEditPermission,
} from '../../../data/external-api/ndex'
import {
  TimeOutErrorIndicator,
  TimeOutErrorMessage,
} from '../../../data/external-api/ndex'
import { AppConfigContext } from '../../../AppConfigContext'
import { logUi } from '../../../debug'
import { useCredentialStore } from '../../../data/hooks/stores/CredentialStore'
import { useMessageStore } from '../../../data/hooks/stores/MessageStore'
import { useNetworkStore } from '../../../data/hooks/stores/NetworkStore'
import { useNetworkSummaryStore } from '../../../data/hooks/stores/NetworkSummaryStore'
import { useOpaqueAspectStore } from '../../../data/hooks/stores/OpaqueAspectStore'
import { useTableStore } from '../../../data/hooks/stores/TableStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useViewModelStore } from '../../../data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../../data/hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { useSaveCyNetworkCopyToNDEx } from '../../../data/hooks/useSaveCyNetworkCopyToNDEx'
import { useSaveCyNetworkToNDEx } from '../../../data/hooks/useSaveCyNetworkToNDEx'
import { KeycloakContext } from '../../../init/keycloak'
import { MessageSeverity } from '../../../models/MessageModel'
import { Network } from '../../../models/NetworkModel'
import { NetworkView } from '../../../models/ViewModel'
import { HcxValidationSaveDialog } from '../../HierarchyViewer/components/Validation/HcxValidationSaveDialog'
import { useHcxValidatorStore } from '../../HierarchyViewer/store/HcxValidatorStore'
import { BaseMenuProps } from '../BaseMenuProps'

export const SaveToNDExMenuItem = (props: BaseMenuProps): ReactElement => {
  const { ndexBaseUrl } = useContext(AppConfigContext)
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false)
  const [showHcxValidationDialog, setShowHcxValidationDialog] =
    useState<boolean>(false)
  const [editPermission, setEditPermission] = useState<boolean>(false)
  const [tooltipText, setTooltipText] = useState<string>('')
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

  const isModified =
    useWorkspaceStore(
      (state) => state.workspace.networkModified[currentNetworkId],
    ) ?? false

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

  const saveNetworkOverwrite = useSaveCyNetworkToNDEx()
  const saveNetworkCopy = useSaveCyNetworkCopyToNDEx()

  useEffect(() => {
    const fetchPermission = async () => {
      if (authenticated && currentNetworkId) {
        try {
          const accessToken = await getToken()
          const hasPermission = await hasNdexEditPermission(
            currentNetworkId,
            accessToken,
            ndexBaseUrl,
          )
          setEditPermission(hasPermission)
        } catch (e) {
          logUi.error(
            `[${fetchPermission.name}]: Error fetching permissions:`,
            e,
          )
          setEditPermission(false)
        }
      }
    }
    if (!authenticated) {
      setEditPermission(false)
      return
    }
    fetchPermission()
  }, [authenticated, currentNetworkId, ndexBaseUrl, getToken])

  useEffect(() => {
    if (currentNetworkId === '') {
      setTooltipText('')
    } else if (!authenticated) {
      setTooltipText('Login to save network to NDEx')
    } else if (summary?.isNdex === false) {
      setTooltipText(
        'This network is currently stored locally. Click here to save it to NDEx ',
      )
    } else if (!editPermission) {
      setTooltipText('Sorry, you do not have edit permission to this network')
    } else if (!isModified) {
      setTooltipText('This network has not been modified since the last save')
    } else {
      setTooltipText('Overwrite network to NDEx')
    }
  }, [
    isModified,
    authenticated,
    editPermission,
    summary?.isNdex,
    currentNetworkId,
  ])

  const overwriteNDExNetwork = async (accessToken: string): Promise<void> => {
    await saveNetworkOverwrite(
      accessToken,
      currentNetworkId,
      network,
      visualStyle,
      summary,
      table.nodeTable,
      table.edgeTable,
      viewModel,
      visualStyleOptions,
      opaqueAspects,
    )
    setNetworkModified(currentNetworkId, false)
    addMessage({
      message: `Saved network to NDEx`,
      duration: 3000,
      severity: MessageSeverity.SUCCESS,
    })

    setShowConfirmDialog(false)
    props.handleClose()
  }

  const saveCopyToNDEx = async (
    accessToken: string,
    deleteOriginal: boolean,
  ): Promise<void> => {
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
        deleteOriginal,
      )
      addMessage({
        message: `Saved a copy of the current network to NDEx with new uuid ${
          uuid as string
        }`,
        duration: 3000,
        severity: MessageSeverity.SUCCESS,
      })
    } catch (e) {
      logUi.error(`[${saveCopyToNDEx.name}]: Error saving copy to NDEx`, e)
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
    const accessToken = await getToken()

    if (summary?.isNdex === false) {
      await saveCopyToNDEx(accessToken, true)
      return
    }

    const localModificationTime = summary?.modificationTime

    try {
      const ndexSummaries = await fetchNdexSummaries(
        currentNetworkId,
        accessToken,
        ndexBaseUrl,
      )
      const ndexSummary = ndexSummaries?.[0]
      const ndexModificationTime = ndexSummary?.modificationTime

      if (ndexModificationTime > localModificationTime) {
        setShowConfirmDialog(true)
      } else {
        await overwriteNDExNetwork(accessToken)
      }
    } catch (e) {
      logUi.error(
        `[${handleSaveCurrentNetworkToNDEx.name}]: Error saving current network to NDEx`,
        e,
      )
      if (e.message.includes(TimeOutErrorIndicator)) {
        addMessage({
          message: TimeOutErrorIndicator,
          duration: 4000,
          severity: MessageSeverity.ERROR,
        })
      } else {
        addMessage({
          message: `Error: Could not overwrite the current network to NDEx. ${
            e.message as string
          }`,
          duration: 4000,
          severity: MessageSeverity.ERROR,
        })
      }
    }
  }

  const enabled =
    currentNetworkId !== '' &&
    (summary?.isNdex ? isModified && editPermission : authenticated)

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
        Save Network to NDEx
      </MenuItem>
    </Box>
  )

  const dialog = (
    <Dialog
      data-testid="save-to-ndex-sync-dialog"
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
        <Button
          data-testid="save-to-ndex-overwrite-button"
          onClick={async () => {
            const accessToken = await getToken()
            await overwriteNDExNetwork(accessToken)
          }}
          sx={{
            color: '#F50157',
            backgroundColor: 'transparent',
            '&:hover': {
              color: '#FFFFFF',
              backgroundColor: '#fc266f',
            },
            '&:disabled': {
              backgroundColor: 'transparent',
            },
          }}
        >
          No, overwrite the network in NDEx
        </Button>
        <Button
          data-testid="save-to-ndex-copy-button"
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
          onClick={async () => {
            const accessToken = await getToken()
            await saveCopyToNDEx(accessToken, false)
          }}
        >
          Yes, create copy to NDEx
        </Button>
      </DialogActions>
    </Dialog>
  )

  if (enabled) {
    return (
      <>
        <Tooltip arrow placement="right" title={tooltipText}>
          {menuItem}
        </Tooltip>
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
      <Tooltip arrow placement="right" title={tooltipText}>
        {menuItem}
      </Tooltip>
    )
  }
}
