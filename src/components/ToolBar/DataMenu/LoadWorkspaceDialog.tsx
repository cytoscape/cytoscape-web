/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import React, { ReactElement, useState, useEffect, useContext } from 'react'
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
import { IdType } from '../../../models/IdType'

export const LoadWorkspaceDialog: React.FC<{
  open: boolean
  handleClose: () => void
}> = ({ open, handleClose }): ReactElement => {
  const [myWorkspaces, setMyWorkspaces] = useState<any[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    null,
  )
  const { ndexBaseUrl } = useContext(AppConfigContext)
  const getToken = useCredentialStore((state) => state.getToken)
  const addNetworks: (ids: IdType | IdType[]) => void = useWorkspaceStore(
    (state) => state.addNetworkIds,
  )
  const setId = useWorkspaceStore((state) => state.setId)

  const resetWorkspace = useWorkspaceStore((state) => state.resetWorkspace)

  const dateFormatter = (timestamp: string | number | Date): string => {
    return new Date(timestamp).toLocaleString()
  }
  const deleteAllNetworks = useWorkspaceStore(
    (state) => state.deleteAllNetworks,
  )

  const handleDeleteAllNetworks = (): void => {
    deleteAllNetworks()
  }
  const [openDialog, setOpenDialog] = useState(false)

  const handleDeleteWorkspaceClick = (): void => {
    setOpenDialog(true)
  }

  const handleCloseDialog = (): void => {
    setOpenDialog(false) //
  }

  useEffect(() => {
    const fetchMyWorkspaces = async (): Promise<any> => {
      const ndexClient = new NDEx(ndexBaseUrl)
      const token = await getToken()
      ndexClient.setAuthToken(token)
      const myWorkspaces = await ndexClient.getUserCyWebWorkspaces()
      return myWorkspaces
    }
    if (open) {
      void fetchMyWorkspaces()
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
    if (selectedWorkspaceId !== null) {
      const selectedWorkspace = myWorkspaces.find(
        (workspace) => workspace.workspaceId === selectedWorkspaceId,
      )
      if (selectedWorkspace) {
        handleDeleteAllNetworks()
        resetWorkspace().then(() => {
          setId(selectedWorkspaceId)
          addNetworks(selectedWorkspace.networkIDs)
        })
      } else {
        alert('Selected workspace not found')
      }
    } else {
      alert('No workspace selected')
    }
    handleClose()
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
      } else {
        alert('Selected workspace not found')
      }
    } else {
      alert('No workspace selected')
    }
    handleClose()
    setOpenDialog(false)
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg">
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
            color="error"
            onClick={handleDeleteWorkspaceClick}
            disabled={selectedWorkspaceId == null}
          >
            Delete Workspace
          </Button>
          <Box sx={{ display: 'flex' }}>
            <Button color="error" onClick={handleClose} sx={{ mr: 2 }}>
              Cancel
            </Button>
            <Button
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
              <Button color="error" onClick={handleConfirmDelete}>
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
