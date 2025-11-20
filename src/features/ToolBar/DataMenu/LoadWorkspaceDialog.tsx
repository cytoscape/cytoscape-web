import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import React, { ReactElement, useContext, useEffect, useState } from 'react'

import {
  deleteNdexWorkspace,
  fetchMyNdexWorkspaces,
} from '../../../data/external-api/ndex'
import { AppConfigContext } from '../../../AppConfigContext'
import { logUi } from '../../../debug'
import { useAppStore } from '../../../data/hooks/stores/AppStore'
import { useCredentialStore } from '../../../data/hooks/stores/CredentialStore'
import { useMessageStore } from '../../../data/hooks/stores/MessageStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { useLoadWorkspace } from '../../../data/hooks/useLoadWorkspace'
import { AppStatus } from '../../../models/AppModel/AppStatus'
import { MessageSeverity } from '../../../models/MessageModel'
import { dateFormatter } from '../../../utils/dateFormat'
import { ConfirmationDialog } from '../../ConfirmationDialog'

export const LoadWorkspaceDialog: React.FC<{
  open: boolean
  handleClose: () => void
}> = ({ open, handleClose }): ReactElement => {
  const [myWorkspaces, setMyWorkspaces] = useState<any[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    null,
  )
  const currentWorkspaceId = useWorkspaceStore((state) => state.workspace.id)
  const setWorkspaceIsRemote = useWorkspaceStore((state) => state.setIsRemote)
  const { ndexBaseUrl } = useContext(AppConfigContext)
  const getToken = useCredentialStore((state) => state.getToken)
  const addMessage = useMessageStore((state) => state.addMessage)
  const apps = useAppStore((state) => state.apps)
  const serviceApps = useAppStore((state) => state.serviceApps)
  const loadWorkspace = useLoadWorkspace()

  const [openDialog, setOpenDialog] = useState(false)
  const [showLoadConfirmDialog, setShowLoadConfirmDialog] = useState(false)

  const handleDeleteWorkspaceClick = (): void => {
    setOpenDialog(true)
  }

  const handleCloseDialog = (): void => {
    setOpenDialog(false)
  }

  const fetchWorkspaces = async (): Promise<void> => {
    const token = await getToken()
    fetchMyNdexWorkspaces(token)
      .then(setMyWorkspaces)
      .catch((error) => {
        const errorMessage =
          error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : 'Unknown error occurred'
        logUi.error(
          `[${LoadWorkspaceDialog.name}]:[${handleCloseDialog.name}] Error fetching workspaces from NDEx`,
          error,
        )

        addMessage({
          message: `Failed to fetch workspaces from NDEx: ${errorMessage}`,
          duration: 4000,
          severity: MessageSeverity.ERROR,
        })
      })
  }
  useEffect(() => {
    if (open) {
      fetchWorkspaces()
    }
  }, [open])

  const handleRowSelect = (workspaceId: string): void => {
    setSelectedWorkspaceId((prevId) =>
      prevId === workspaceId ? null : workspaceId,
    )
  }

  const handleOpenWorkspace = (): void => {
    const selectedWorkspace = myWorkspaces.find(
      (workspace) => workspace.workspaceId === selectedWorkspaceId,
    )
    if (selectedWorkspace) {
      setShowLoadConfirmDialog(true)
    } else {
      addMessage({
        message: 'Selected workspace not found',
        duration: 4000,
        severity: MessageSeverity.WARNING,
      })
    }
  }

  const handleConfirmLoadWorkspace = async (): Promise<void> => {
    const selectedWorkspace = myWorkspaces.find(
      (workspace) => workspace.workspaceId === selectedWorkspaceId,
    )
    if (selectedWorkspace) {
      try {
        await loadWorkspace(selectedWorkspace, apps, serviceApps)
        handleClose()
        // Reload the page to apply changes
        window.location.reload()
      } catch (e) {
        const errorMessage =
          e instanceof Error
            ? e.message
            : typeof e === 'string'
              ? e
              : 'Unknown error occurred'
        logUi.error(
          `[${handleConfirmLoadWorkspace.name}]: Failed to open workspace`,
          e,
        )
        addMessage({
          message: `Failed to open workspace: ${errorMessage}`,
          duration: 4000,
          severity: MessageSeverity.ERROR,
        })
        setShowLoadConfirmDialog(false)
      }
    } else {
      addMessage({
        message: 'Selected workspace not found',
        duration: 4000,
        severity: MessageSeverity.WARNING,
      })
      setShowLoadConfirmDialog(false)
    }
  }

  const handleConfirmDelete = async (): Promise<void> => {
    if (selectedWorkspaceId !== null) {
      const selectedWorkspace = myWorkspaces.find(
        (workspace) => workspace.workspaceId === selectedWorkspaceId,
      )
      if (selectedWorkspace) {
        try {
          const token = await getToken()
          await deleteNdexWorkspace(
            selectedWorkspace.workspaceId,
            token,
            ndexBaseUrl,
          )
          if (currentWorkspaceId === selectedWorkspace.workspaceId) {
            setWorkspaceIsRemote(false) //If user wants to delete the current workspace, then mark it as 'local'
          }
          await fetchWorkspaces()
          setSelectedWorkspaceId(null)
          addMessage({
            message: 'Workspace deleted successfully',
            duration: 3000,
            severity: MessageSeverity.SUCCESS,
          })
          window.location.reload()
        } catch (e) {
          const errorMessage =
            e instanceof Error
              ? e.message
              : typeof e === 'string'
                ? e
                : 'Unknown error occurred'
          logUi.error(
            `[${handleConfirmDelete.name}]: Failed to delete workspace`,
            e,
          )
          addMessage({
            message: `Failed to delete workspace: ${errorMessage}`,
            duration: 4000,
            severity: MessageSeverity.ERROR,
          })
        }
      } else {
        addMessage({
          message: 'Selected workspace not found',
          duration: 4000,
          severity: MessageSeverity.WARNING,
        })
      }
    } else {
      addMessage({
        message: 'No workspace selected',
        duration: 4000,
        severity: MessageSeverity.WARNING,
      })
    }
    setOpenDialog(false)
  }

  return (
    <Dialog
      data-testid="load-workspace-dialog"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="lg"
    >
      <DialogTitle>My Workspaces</DialogTitle>
      <DialogContent>
        {myWorkspaces.length === 0 ? (
          <Typography variant="subtitle1" align="center" sx={{ mt: 2 }}>
            No workspaces available. Please create a new workspace.
          </Typography>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Select</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Number of Networks</TableCell>
                <TableCell>Creation Time</TableCell>
                <TableCell>Modification Time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {myWorkspaces.map((workspace) => (
                <TableRow
                  key={workspace.workspaceId}
                  onClick={() => handleRowSelect(workspace.workspaceId)}
                  hover
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      data-testid={`load-workspace-checkbox-${workspace.workspaceId}`}
                      checked={selectedWorkspaceId === workspace.workspaceId}
                      onChange={() => handleRowSelect(workspace.workspaceId)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                  <TableCell>{workspace.name}</TableCell>
                  <TableCell>
                    {workspace.networkIDs ? workspace.networkIDs.length : 0}
                  </TableCell>
                  <TableCell>{dateFormatter(workspace.creationTime)}</TableCell>
                  <TableCell>
                    {dateFormatter(workspace.modificationTime)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions
        sx={{
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <Button
            data-testid="load-workspace-delete-button"
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
            onClick={handleDeleteWorkspaceClick}
            disabled={selectedWorkspaceId == null}
          >
            Delete Workspace
          </Button>
          <Box sx={{ display: 'flex' }}>
            <Button
              data-testid="load-workspace-cancel-button"
              color="primary"
              onClick={handleClose}
              sx={{ mr: 2 }}
            >
              Cancel
            </Button>
            <Button
              data-testid="load-workspace-open-button"
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
              onClick={handleOpenWorkspace}
              disabled={selectedWorkspaceId == null}
            >
              Open Workspace
            </Button>
          </Box>
          <Dialog open={openDialog} onClose={handleCloseDialog}>
            <DialogTitle>Delete Workspace</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Are you sure you want to delete this workspace? This action
                cannot be undone.
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Cancel</Button>
              <Button
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
                onClick={handleConfirmDelete}
              >
                Delete
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </DialogActions>
      <ConfirmationDialog
        title="Load Workspace"
        message={
          selectedWorkspaceId
            ? `Are you sure you want to load the workspace "${myWorkspaces.find((w) => w.workspaceId === selectedWorkspaceId)?.name}"? This will replace all existing networks in your workspace. This action cannot be undone.`
            : 'Are you sure you want to load this workspace? This will replace all existing networks in your workspace. This action cannot be undone.'
        }
        onConfirm={handleConfirmLoadWorkspace}
        onCancel={() => setShowLoadConfirmDialog(false)}
        open={showLoadConfirmDialog}
        setOpen={setShowLoadConfirmDialog}
        buttonTitle="Load (cannot be undone)"
        isAlert={true}
      />
    </Dialog>
  )
}

export default LoadWorkspaceDialog
