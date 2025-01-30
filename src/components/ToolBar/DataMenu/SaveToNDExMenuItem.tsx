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
import { ReactElement, useContext, useEffect, useState } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'
import { PermissionType } from '../../../models/NetworkModel/AccessPermission'
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
import { AppConfigContext } from '../../../AppConfigContext'
import { useMessageStore } from '../../../store/MessageStore'
import { KeycloakContext } from '../../../bootstrap'
import { useHcxValidatorStore } from '../../../features/HierarchyViewer/store/HcxValidatorStore'
import { HcxValidationSaveDialog } from '../../../features/HierarchyViewer/components/Validation/HcxValidationSaveDialog'
import { NetworkView } from '../../../models/ViewModel'
import { useUiStateStore } from '../../../store/UiStateStore'
import { useOpaqueAspectStore } from '../../../store/OpaqueAspectStore'
import {
  useSaveNetworkToNDEx,
  useSaveCopyToNDEx,
  TimeOutErrorIndicator,
  TimeOutErrorMessage,
} from '../../../utils/ndex-utils'
import { MessageSeverity } from '../../../models/MessageModel'

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

  const saveNetworkOverwrite = useSaveNetworkToNDEx()
  const saveNetworkCopy = useSaveCopyToNDEx()

  useEffect(() => {
    const fetchPermission = async () => {
      if (authenticated && currentNetworkId) {
        const ndexClient = new NDEx(ndexBaseUrl)
        try {
          const accessToken = await getToken()
          ndexClient.setAuthToken(accessToken)
          const permission = (
            await ndexClient.getNetworkPermissionsByUUIDs([currentNetworkId])
          )?.[currentNetworkId]
          setEditPermission(
            permission === PermissionType.ADMIN ||
              permission === PermissionType.WRITE,
          )
        } catch (e) {
          console.error('Error fetching permissions:', e)
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
      setTooltipText('')
    }
  }, [
    isModified,
    authenticated,
    editPermission,
    summary?.isNdex,
    currentNetworkId,
  ])

  const overwriteNDExNetwork = async (
    accessToken: string,
    ndexClient: NDEx,
  ): Promise<void> => {
    await saveNetworkOverwrite(
      ndexBaseUrl,
      accessToken,
      ndexClient,
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
    setCurrentNetworkId(currentNetworkId)
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
    ndexClient: NDEx,
    deleteOriginal: boolean,
  ): Promise<void> => {
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
    const ndexClient = new NDEx(ndexBaseUrl)
    const accessToken = await getToken()
    ndexClient.setAuthToken(accessToken)

    if (summary?.isNdex === false) {
      await saveCopyToNDEx(accessToken, ndexClient, true)
      return
    }

    const localModificationTime = summary?.modificationTime

    try {
      const ndexSummary = await ndexClient.getNetworkSummary(currentNetworkId)
      const ndexModificationTime = ndexSummary?.modificationTime

      if (ndexModificationTime > localModificationTime) {
        setShowConfirmDialog(true)
      } else {
        await overwriteNDExNetwork(accessToken, ndexClient)
      }
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
          message: `Error: Could not overwrite the current network to NDEx. ${
            e.message as string
          }`,
          duration: 3000,
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
          onClick={async () => {
            const ndexClient = new NDEx(ndexBaseUrl)
            const accessToken = await getToken()
            ndexClient.setAuthToken(accessToken)
            await overwriteNDExNetwork(accessToken, ndexClient)
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
            const ndexClient = new NDEx(ndexBaseUrl)
            const accessToken = await getToken()
            ndexClient.setAuthToken(accessToken)
            await saveCopyToNDEx(accessToken, ndexClient, false)
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
