import {
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material'
import { useState } from 'react'

import { CyDialog } from '@/components/CyDialog'
import { fetchMyNdexWorkspaces } from '../../../data/external-api/ndex'
import { useMessageStore } from '../../../data/hooks/stores/MessageStore'
import { useSaveWorkspace } from '../../../data/hooks/useSaveWorkspaceToNDEx'
import { useWorkspaceData } from '../../../data/hooks/useWorkspaceData'
import { logUi } from '../../../debug'
import { MessageSeverity } from '../../../models/MessageModel'
import { ConfirmationDialog } from '../../ConfirmationDialog'

interface WorkspaceNamingDialogProps {
  openDialog: boolean
  onClose: () => void
  ndexBaseUrl: string
  getToken: () => Promise<string>
}

export const WorkspaceNamingDialog = ({
  openDialog,
  onClose,
  ndexBaseUrl,
  getToken,
}: WorkspaceNamingDialogProps) => {
  const {
    apps,
    serviceApps,
    networks,
    visualStyles,
    summaries,
    tables,
    viewModels,
    networkVisualStyleOpt,
    opaqueAspects,
    allNetworkId,
    workspaceId,
    currentWorkspaceName,
    networkModifiedStatus,
  } = useWorkspaceData()
  const [workspaceName, setWorkspaceName] = useState('')
  // The field opens empty (the current name is only a placeholder), so the
  // error waits until the user has typed: Save alone is disabled until then
  const [isNameTouched, setIsNameTouched] = useState(false)
  const isNameBlank = workspaceName.trim() === ''
  const showNameError = isNameTouched && isNameBlank
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [workspaceIdToBeOverwritten, setWorkspaceIdToBeOverwritten] = useState<
    string | undefined
  >(undefined)
  const saveWorkspace = useSaveWorkspace()

  const addMessage = useMessageStore((state) => state.addMessage)

  const handleConfirmClose = () => {
    setShowConfirmDialog(false)
  }

  const handleConfirmSave = async () => {
    const accessToken = await getToken()
    try {
      await saveWorkspace(
        accessToken,
        allNetworkId,
        networkModifiedStatus,
        networks,
        visualStyles,
        summaries,
        tables,
        viewModels,
        networkVisualStyleOpt,
        opaqueAspects,
        true,
        workspaceName,
        workspaceId,
        apps,
        serviceApps,
        workspaceIdToBeOverwritten,
      )
    } catch (e) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : typeof e === 'string'
            ? e
            : 'Unknown error occurred'
      addMessage({
        duration: 4000,
        message: `Failed to overwrite the workspace in NDEx: ${errorMessage}`,
        severity: MessageSeverity.ERROR,
      })
      logUi.error(
        `[${handleConfirmSave.name}]: Failed to overwrite the workspace in NDEx`,
        e,
      )
      throw e
    }
    handleConfirmClose()
    onClose()
  }

  const onSave = async () => {
    if (isNameBlank) return
    try {
      const accessToken = await getToken()
      const existingWorkspaces = await fetchMyNdexWorkspaces(
        accessToken,
        ndexBaseUrl,
      )
      const existingWorkspaceId = existingWorkspaces.find(
        (workspace) => workspace.name === workspaceName,
      )?.workspaceId

      if (existingWorkspaceId) {
        setWorkspaceIdToBeOverwritten(existingWorkspaceId)
        setShowConfirmDialog(true)
        return
      } else {
        await saveWorkspace(
          accessToken,
          allNetworkId,
          networkModifiedStatus,
          networks,
          visualStyles,
          summaries,
          tables,
          viewModels,
          networkVisualStyleOpt,
          opaqueAspects,
          false,
          workspaceName,
          workspaceId,
          apps,
          serviceApps,
        )
      }
    } catch (e) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : typeof e === 'string'
            ? e
            : 'Unknown error occurred'
      logUi.error(`[${onSave.name}]: Failed to save the workspace to NDEx`, e)
      addMessage({
        duration: 4000,
        message: `Failed to save the workspace to NDEx: ${errorMessage}`,
        severity: MessageSeverity.ERROR,
      })
    }
    onClose()
  }
  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setWorkspaceName(event.target.value)
    setIsNameTouched(true)
  }

  return (
    <>
      <CyDialog data-testid="workspace-naming-dialog" open={openDialog}>
        <DialogTitle>Save Workspace</DialogTitle>
        <DialogContent sx={{ width: '300px' }}>
          <TextField
            data-testid="workspace-naming-name-input"
            autoFocus
            id="name"
            label="Unique Workspace Name"
            type="text"
            fullWidth
            variant="standard"
            value={workspaceName}
            placeholder={currentWorkspaceName}
            onChange={handleNameChange}
            onKeyDown={(e) => {
              e.stopPropagation()
            }}
            error={showNameError}
            helperText={showNameError ? 'Please enter a workspace name.' : ' '}
          />
        </DialogContent>
        <DialogActions>
          <Button
            data-testid="workspace-naming-cancel-button"
            variant="outlined"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            data-testid="workspace-naming-save-button"
            variant="contained"
            disabled={isNameBlank}
            onClick={onSave}
            sx={{ px: 4 }}
          >
            Save
          </Button>
        </DialogActions>
      </CyDialog>
      <ConfirmationDialog
        title="Confirm Workspace Overwrite"
        message="A workspace with the same name already exists in NDEx. Do you want to overwrite it?"
        onConfirm={handleConfirmSave}
        open={showConfirmDialog}
        setOpen={setShowConfirmDialog}
        buttonTitle="Overwrite"
        isAlert={true}
      />
    </>
  )
}
