/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import React, { ReactElement, useState, useEffect, useContext } from 'react';
import { Dialog, DialogTitle, DialogContent, Table, TableHead, TableRow, TableCell, TableBody, DialogActions, Button, Box, Checkbox } from '@mui/material';
// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client';
import { AppConfigContext } from '../../../AppConfigContext';
import { useCredentialStore } from '../../../store/CredentialStore';
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { IdType } from '../../../models/IdType'

export const LoadWorkspaceDialog: React.FC<{ open: boolean; handleClose: () => void }> = ({ open, handleClose }): ReactElement => {
  const [myWorkspaces, setMyWorkspaces] = useState<any[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const { ndexBaseUrl } = useContext(AppConfigContext);
  const getToken = useCredentialStore((state) => state.getToken);
  const addNetworks: (ids: IdType | IdType[]) => void = useWorkspaceStore(
    (state) => state.addNetworkIds,
  )

  const dateFormatter = (timestamp: string | number | Date): string => {
    return new Date(timestamp).toLocaleString();
  };

  useEffect(() => {
    const fetchMyWorkspaces = async (): Promise<any> => {
      const ndexClient = new NDEx(ndexBaseUrl);
      const token = await getToken();
      ndexClient.setAuthToken(token);
      const myWorkspaces = await ndexClient.getUserCyWebWorkspaces();
      return myWorkspaces;
    };

    if (open) {
      void fetchMyWorkspaces().then(setMyWorkspaces);
    }
  }, [open]);

  const handleRowSelect = (workspaceId: string): void => {
    setSelectedWorkspaceId(workspaceId);
  };

  const handleOpenWorkspace = (): void => {
    if (selectedWorkspaceId !== null) {
      const selectedWorkspace = myWorkspaces.find(workspace => workspace.workspaceId === selectedWorkspaceId);
      if (selectedWorkspace) {
        addNetworks(selectedWorkspace.networkIDs)
      } else {
        alert('Selected workspace not found');
      }
    } else {
      alert('No workspace selected');
    }
    handleClose();
  };
  
  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg">
      <DialogTitle>My Workspaces</DialogTitle>
      <DialogContent>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Select</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Workspace ID</TableCell>
              <TableCell>Number of Networks</TableCell>
              <TableCell>Creation Time</TableCell>
              <TableCell>Modification Time</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {myWorkspaces.map((workspace) => (
              <TableRow key={workspace.workspaceId}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedWorkspaceId === workspace.workspaceId}
                    onChange={() => handleRowSelect(workspace.workspaceId)}
                  />
                </TableCell>
                <TableCell>{workspace.name}</TableCell>
                <TableCell>{workspace.workspaceId}</TableCell>
                <TableCell>{(workspace.networkIDs) ? workspace.networkIDs.length : 0}</TableCell>
                <TableCell>{dateFormatter(workspace.creationTime)}</TableCell>
                <TableCell>{dateFormatter(workspace.modificationTime)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
      <DialogActions
        sx={{
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
          <Button color="error" onClick={handleClose} sx={{ mr: 2 }}>
            Cancel
          </Button>
          <Button onClick={handleOpenWorkspace} disabled={selectedWorkspaceId == null}>
            Open Workspace
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default LoadWorkspaceDialog;
