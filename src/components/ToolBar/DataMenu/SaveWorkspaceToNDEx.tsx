import React, { useState, useContext } from 'react';
import { MenuItem, Box, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from '@mui/material';
import { BaseMenuProps } from '../BaseMenuProps';
// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client';
import { useCredentialStore } from '../../../store/CredentialStore';
import { AppConfigContext } from '../../../AppConfigContext';
import { useMessageStore } from '../../../store/MessageStore';
import { KeycloakContext } from '../../..';
import { getWorkspaceFromDb } from '../../../store/persist/db';

export const SaveWorkspaceToNDExMenuItem = (props: BaseMenuProps): React.ReactElement => {
  const { ndexBaseUrl } = useContext(AppConfigContext);
  const client = useContext(KeycloakContext);
  const getToken = useCredentialStore((state) => state.getToken);
  const authenticated: boolean = client?.authenticated ?? false;
  const addMessage = useMessageStore((state) => state.addMessage);

  const [workspaceName, setWorkspaceName] = useState<string>('');
  const [openDialog, setOpenDialog] = useState<boolean>(false);

  const handleOpenDialog = (): void => {
    setOpenDialog(true);
  };
  
  const handleCloseDialog = (): void => {
    setOpenDialog(false);
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setWorkspaceName(event.target.value);
  };

  const saveCopyToNDEx = async (): Promise<void> => {
    if (workspaceName.trim().length === 0) {
      alert("Please enter a workspace name");
      return;
    }

    const ndexClient = new NDEx(ndexBaseUrl);
    const accessToken = await getToken();
    ndexClient.setAuthToken(accessToken);

    try {
      const workspace = await getWorkspaceFromDb();
      const response = await ndexClient.createCyWebWorkspace({
        name: workspaceName,
        options: { currentNetwork: workspace.currentNetworkId },
        networkIDs: workspace.networkIds
      });
      const { uuid, modificationTime } = response;
      console.log(uuid)
      console.log(modificationTime)
      

      addMessage({
        message: `Saved workspace to NDEx.`,
        duration: 3000,
      });
    } catch (e) {
      console.error(e);
      addMessage({
        message: `Error: Could not save workspace to NDEx. ${e.message as string}`,
        duration: 3000,
      });
    }

    handleCloseDialog();
    props.handleClose();
  };

  const handleSaveCurrentNetworkToNDEx = async (): Promise<void> => {
    handleOpenDialog();
  };

  const dialog = (
    <Dialog open={openDialog} onClose={handleCloseDialog}>
      <DialogTitle>Save Workspace to NDEx</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          id="name"
          label="Workspace Name"
          type="text"
          fullWidth
          variant="standard"
          value={workspaceName}
          onChange={handleNameChange}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseDialog}>Cancel</Button>
        <Button onClick={saveCopyToNDEx}>Save</Button>
      </DialogActions>
    </Dialog>
  );

  const menuItem = (
    <MenuItem
      disabled={!authenticated}
      onClick={handleSaveCurrentNetworkToNDEx}
    >
      Save workspace to NDEx (overwrite)
    </MenuItem>
  );

  return (
    <>
      {authenticated ? menuItem : (
        <Tooltip title="Login to save a copy of the current network to NDEx">
          <Box>{menuItem}</Box>
        </Tooltip>
      )}
      {dialog}
    </>
  );
};
