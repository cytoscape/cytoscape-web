/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import React, { ReactElement, useState, useEffect, useContext } from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  DialogActions,
  Button,
  Box,
  Checkbox,
  Typography,
} from '@mui/material'
// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'
import { AppConfigContext } from '../../../AppConfigContext'
import { useCredentialStore } from '../../../store/CredentialStore'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { fetchMyWorkspaces } from '../../../utils/ndex-utils'
import { MessageSeverity } from '../../../models/MessageModel'
import { useAppStore } from '../../../store/AppStore'
import { useMessageStore } from '../../../store/MessageStore'
import { AppStatus } from '../../../models/AppModel/AppStatus'
import { Workspace } from '../../../models/WorkspaceModel'
import { dateFormatter } from '../../../utils/date-format'

export const LoadWorkspaceDialog: React.FC<{
  open: boolean
  handleClose: () => void
}> = ({ open, handleClose }): ReactElement => {
  const [myWorkspaces, setMyWorkspaces] = useState<any[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    null,
  )
  const currentWorkspaceId = useWorkspaceStore((state) => state.workspace.id)

  const setId = useWorkspaceStore((state) => state.setId)

  const { ndexBaseUrl } = useContext(AppConfigContext)
  const getToken = useCredentialStore((state) => state.getToken)
  const setWorkSpace = useWorkspaceStore((state) => state.set)
  const resetWorksapce = useWorkspaceStore((state) => state.resetWorkspace)
  const addMessage = useMessageStore((state) => state.addMessage)
  const apps = useAppStore((state) => state.apps)
  const serviceApps = useAppStore((state) => state.serviceApps)
  const addServiceApp = useAppStore((state) => state.addService)
  const removeServiceApp = useAppStore((state) => state.removeService)
  const setAppStatus = useAppStore((state) => state.setStatus)

  const [openDialog, setOpenDialog] = useState(false)

  const handleDeleteWorkspaceClick = (): void => {
    setOpenDialog(true)
  }

  const handleCloseDialog = (): void => {
    setOpenDialog(false)
  }

  useEffect(() => {
    if (open) {
      void fetchMyWorkspaces(ndexBaseUrl, getToken)
        .then(setMyWorkspaces)
        .catch((err) => {
          console.log(err)
        })
    }
  }, [open, ndexBaseUrl, getToken])

  const handleRowSelect = (workspaceId: string): void => {
    setSelectedWorkspaceId((prevId) =>
      prevId === workspaceId ? null : workspaceId,
    )
  }

  const handleOpenWorkspace = async (): Promise<void> => {
    const selectedWorkspace = myWorkspaces.find(
      (workspace) => workspace.workspaceId === selectedWorkspaceId,
    )
    if (selectedWorkspace) {
      try {
        resetWorksapce().then(() => {
          setWorkSpace({
            name: selectedWorkspace.name,
            id: selectedWorkspace.workspaceId,
            currentNetworkId: selectedWorkspace.options?.currentNetwork ?? '',
            networkIds: selectedWorkspace.networkIDs,
            localModificationTime: selectedWorkspace.modificationTime,
            creationTime: selectedWorkspace.creationTime,
            networkModified: {},
          } as Workspace)
          // Add apps
          const activeApps = new Set(
            selectedWorkspace.options?.activeApps ?? [],
          )
          const currentApps = new Set(
            Object.keys(apps).filter(
              (key) => apps[key].status === AppStatus.Active,
            ),
          )
          currentApps.forEach((appKey) => {
            if (!activeApps.has(appKey)) {
              setAppStatus(appKey, AppStatus.Inactive)
            }
          })
          activeApps.forEach((appKey) => {
            if (!currentApps.has(appKey as string)) {
              setAppStatus(appKey as string, AppStatus.Active)
            }
          })
          // Add service apps
          const activeServiceApps = new Set(
            selectedWorkspace.options?.serviceApps ?? [],
          )
          const currentServiceApps = new Set(Object.keys(serviceApps))
          currentServiceApps.forEach((serviceAppKey) => {
            if (!activeServiceApps.has(serviceAppKey)) {
              removeServiceApp(serviceAppKey)
            }
          })
          activeServiceApps.forEach((serviceAppKey) => {
            if (!currentServiceApps.has(serviceAppKey as string)) {
              addServiceApp(serviceAppKey as string)
            }
          })
        })
        handleClose()
      } catch (e) {
        addMessage({
          message: 'Failed to open workspace',
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
  }

  const handleConfirmDelete = async (): Promise<void> => {
    if (selectedWorkspaceId !== null) {
      const selectedWorkspace = myWorkspaces.find(
        (workspace) => workspace.workspaceId === selectedWorkspaceId,
      )
      if (selectedWorkspace) {
        const ndexClient = new NDEx(ndexBaseUrl)
        const token = await getToken()
        ndexClient.setAuthToken(token)
        await ndexClient.deleteCyWebWorkspace(selectedWorkspace.workspaceId)
        if (currentWorkspaceId === selectedWorkspace.workspaceId) {
          setId(uuidv4())
        }
      } else {
        alert('Selected workspace not found')
      }
      await fetchMyWorkspaces(ndexBaseUrl, getToken)
        .then(setMyWorkspaces)
        .catch((err) => {
          console.log(err)
        })
      setSelectedWorkspaceId(null)
    } else {
      alert('No workspace selected')
    }
    setOpenDialog(false)
  }

  return (
    <Dialog
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
            <Button color="primary" onClick={handleClose} sx={{ mr: 2 }}>
              Cancel
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
    </Dialog>
  )
}

export default LoadWorkspaceDialog
