import React, { useState, useContext, useEffect } from 'react';
import { MenuItem, Box, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { BaseMenuProps } from '../BaseMenuProps';
// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client';
import { useCredentialStore } from '../../../store/CredentialStore';
import { AppConfigContext } from '../../../AppConfigContext';
import { useMessageStore } from '../../../store/MessageStore';
import { KeycloakContext } from '../../..';
import { useWorkspaceStore } from '../../../store/WorkspaceStore';
import { exportNetworkToCx2 } from '../../../store/io/exportCX';
import { useNetworkSummaryStore } from '../../../store/NetworkSummaryStore';
import { useVisualStyleStore } from '../../../store/VisualStyleStore';
import { useNetworkStore } from '../../../store/NetworkStore';
import { useTableStore } from '../../../store/TableStore';
import { useViewModelStore } from '../../../store/ViewModelStore';
import { Network } from '../../../models/NetworkModel'
import { IdType } from '../../../models/IdType'

export const SaveWorkspaceToNDExOverwriteMenuItem = (props: BaseMenuProps): React.ReactElement => {
  const { ndexBaseUrl } = useContext(AppConfigContext);
  const client = useContext(KeycloakContext);
  const getToken = useCredentialStore((state) => state.getToken);
  const authenticated: boolean = client?.authenticated ?? false;
  const addMessage = useMessageStore((state) => state.addMessage);

  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const updateSummary = useNetworkSummaryStore((state) => state.update)
  const workspace = useWorkspaceStore((state) => state.workspace)
  const [hasWorkspace, setHasWorkspace] = useState(false);

  const handleOpenDialog = (): void => {
    setOpenDialog(true);
  };

  const handleCloseDialog = (): void => {
    setOpenDialog(false);
  };
  const allNetworkId = useWorkspaceStore(
    (state) => state.workspace.networkIds,
  )


  const addNetworkToWorkspace = useWorkspaceStore(
    (state) => state.addNetworkIds,
  )


  useEffect(() => {
    const fetchMyWorkspaces = async (): Promise<any> => {
      const ndexClient = new NDEx(ndexBaseUrl);
      const token = await getToken();
      ndexClient.setAuthToken(token);
      const myWorkspaces = await ndexClient.getUserCyWebWorkspaces();
      return myWorkspaces;
    };
    fetchMyWorkspaces().then(function (resultArray) {
      const workspaceIds = resultArray.map((item: { workspaceId: any; }) => item.workspaceId);
      const savedWorkspace = workspaceIds.includes(workspace.id);
      setHasWorkspace(savedWorkspace);
    }).catch(function (error) {
      console.error('Error:', error);
    });
  }, [open]);

  const saveNetworkToNDEx = async (networkId: string): Promise<void> => {
    const ndexClient = new NDEx(ndexBaseUrl)
    const accessToken = await getToken()
    const network = useNetworkStore.getState().networks.get(networkId) as Network;
    const visualStyle = useVisualStyleStore.getState().visualStyles[networkId];
    const summary = useNetworkSummaryStore.getState().summaries[networkId];
    const nodeTable = useTableStore.getState().tables[networkId].nodeTable;
    const edgeTable = useTableStore.getState().tables[networkId].edgeTable;
    const viewModel = useViewModelStore.getState().viewModels[networkId];

    ndexClient.setAuthToken(accessToken)
    const cx = exportNetworkToCx2(
      network,
      visualStyle,
      summary,
      nodeTable,
      edgeTable,
      viewModel,
    )
    await ndexClient.updateNetworkFromRawCX2(networkId, cx)
    const ndexSummary = await ndexClient.getNetworkSummary(networkId)
    const newNdexModificationTime = ndexSummary.modificationTime
    updateSummary(networkId, {
      modificationTime: newNdexModificationTime,
    })
  }

  const saveCopyToNDEx = async (networkId: string): Promise<void> => {
    const ndexClient = new NDEx(ndexBaseUrl)
    const accessToken = await getToken()
    ndexClient.setAuthToken(accessToken)
    const network = useNetworkStore.getState().networks.get(networkId) as Network;
    const visualStyle = useVisualStyleStore.getState().visualStyles[networkId];
    const summary = useNetworkSummaryStore.getState().summaries[networkId];
    const nodeTable = useTableStore.getState().tables[networkId].nodeTable;
    const edgeTable = useTableStore.getState().tables[networkId].edgeTable;
    const viewModel = useViewModelStore.getState().viewModels[networkId];
    const cx = exportNetworkToCx2(
      network,
      visualStyle,
      summary,
      nodeTable,
      edgeTable,
      viewModel,
      `Copy of ${summary.name}`,
    )

    try {
      const { uuid } = await ndexClient.createNetworkFromRawCX2(cx)
      addNetworkToWorkspace(uuid as IdType)

      addMessage({
        message: `Saved a copy of the current network to NDEx with new uuid ${uuid as string
          }`,
        duration: 3000,
      })
    } catch (e) {
      console.log(e)
      addMessage({
        message: `Error: Could not save a copy of the current network to NDEx. ${e.message as string
          }`,
        duration: 3000,
      })
    }
  }

  const saveAllNetworks = async (): Promise<void> => {
    for (const networkId of allNetworkId) {
      try {
        await saveNetworkToNDEx(networkId);
      } catch (e) {
        await saveCopyToNDEx(networkId)
      }
    }
  };

  const saveWorkspaceToNDEx = async (): Promise<void> => {
    await saveAllNetworks()
    const ndexClient = new NDEx(ndexBaseUrl);
    const accessToken = await getToken();
    ndexClient.setAuthToken(accessToken);

    try {
      const update = await ndexClient.updateCyWebWorkspace(workspace.id, {
        name: workspace.name,
        options: { currentNetwork: workspace.currentNetworkId },
        networkIDs: workspace.networkIds
      })
      console.log(update)

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
      <DialogTitle>Do you want to save (overwrite) the current workspace?</DialogTitle>
      <DialogContent>

      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseDialog}>Cancel</Button>
        <Button onClick={saveWorkspaceToNDEx}>Save</Button>
      </DialogActions>
    </Dialog>
  );

  const menuItem = (
    <MenuItem
      disabled={!authenticated || !hasWorkspace}
      onClick={handleSaveCurrentNetworkToNDEx}
    >
      Save workspace
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