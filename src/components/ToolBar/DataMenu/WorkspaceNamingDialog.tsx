import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'
import { fetchMyWorkspaces, useSaveWorkspace } from '../../../utils/ndex-utils'
import { useMessageStore } from '../../../store/MessageStore'
import { MessageSeverity } from '../../../models/MessageModel'
import { useWorkspaceData } from '../../../store/hooks/useWorkspaceData'
import { ConfirmationDialog } from '../../Util/ConfirmationDialog'

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
  const [showWarning, setShowWarning] = useState(false)
  const [warningMessage, setWarningMessage] = useState('')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [workspaceIdToBeOverwritten, setWorkspaceIdToBeOverwritten] = useState<
    string | undefined
  >(undefined)
  const saveWorkspace = useSaveWorkspace()
  const ndexClient = new NDEx(ndexBaseUrl)

  const addMessage = useMessageStore((state) => state.addMessage)

  const handleConfirmClose = () => {
    setShowConfirmDialog(false)
  }

  const handleConfirmSave = async () => {
    const accessToken = await getToken()
    try {
      await saveWorkspace(
        accessToken,
        ndexBaseUrl,
        ndexClient,
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
      addMessage({
        duration: 4000,
        message: 'Failed to overwrite the workspace in NDEx',
        severity: MessageSeverity.ERROR,
      })
      console.error(e)
    }
    handleConfirmClose()
    onClose()
  }

  const onSave = async () => {
    if (workspaceName.trim().length === 0) {
      setWarningMessage('Please enter a workspace name')
      setShowWarning(true)
      return
    }
    try {
      const existingWorkspaces = await fetchMyWorkspaces(ndexBaseUrl, getToken)
      const workspaceId = existingWorkspaces.find(
        (workspace) => workspace.name === workspaceName,
      )?.workspaceId

      if (workspaceId) {
        setWorkspaceIdToBeOverwritten(workspaceId)
        setShowConfirmDialog(true)
        return
      } else {
        const accessToken = await getToken()
        await saveWorkspace(
          accessToken,
          ndexBaseUrl,
          ndexClient,
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
      console.error(e)
      addMessage({
        duration: 4000,
        message: 'Failed to save the workspace to NDEx',
        severity: MessageSeverity.ERROR,
      })
    }
    onClose()
  }
  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setWorkspaceName(event.target.value)
  }

  return (
    <>
      <Dialog
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
        }}
        onKeyDown={(e) => {
          e.stopPropagation()
        }}
        open={openDialog}
        onClose={onClose}
      >
        <DialogTitle>Save Workspace</DialogTitle>
        <DialogContent sx={{ width: '300px' }}>
          <TextField
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
              setShowWarning(false)
            }}
          />
          {showWarning && (
            <Typography color="error" variant="body2">
              {warningMessage}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="primary">
            Cancel
          </Button>
          <Button
            disabled={workspaceName.trim().length === 0}
            onClick={onSave}
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
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
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
