import { v4 as uuidv4 } from 'uuid'
import React, { ReactElement } from 'react';
import { MenuItem } from '@mui/material';
import { BaseMenuProps } from '../../../components/ToolBar/BaseMenuProps';
import { useWorkspaceStore } from '../../../store/WorkspaceStore';
import { useViewModelStore } from '../../../store/ViewModelStore';
import { useNetworkStore } from '../../../store/NetworkStore';
import { useLayoutStore } from '../../../store/LayoutStore';
import { useTableStore } from '../../../store/TableStore';
import { useVisualStyleStore } from '../../../store/VisualStyleStore';
import { NetworkView } from '../../../models/ViewModel'
import { IdType } from '../../../models/IdType'
import { extractSubnetworkFromSelection } from '../utils/extractNetwork'
import { Network } from '../../../models/NetworkModel';
const MAX_SELECTED_OBJ = 300

export const ExampleThreeMenuItem = ({ handleClose }: BaseMenuProps): ReactElement => {
  const addNewNetwork = useNetworkStore((state) => state.add)
  const setVisualStyle = useVisualStyleStore((state) => state.add)
  const setViewModel = useViewModelStore((state) => state.add)
  const setTables = useTableStore((state) => state.add)

  const addNetworkToWorkspace = useWorkspaceStore(
    (state) => state.addNetworkIds,
  )
  const setCurrentNetworkId = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )
  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const currentNetwork: Network | undefined = useNetworkStore(
    (state) => state.networks.get(currentNetworkId)
  );
  const networkViewModel: NetworkView | undefined = useViewModelStore(
    (state) => state.getViewModel(currentNetworkId)
  )
  const tables = useTableStore((state) => state.tables[currentNetworkId]);
  const nodeTable = tables?.nodeTable
  const edgeTable = tables?.edgeTable
  const visualStyle = useVisualStyleStore((state) => state.visualStyles[currentNetworkId])
  const nodeViewModel = networkViewModel?.nodeViews
  const edgeViewModel = networkViewModel?.edgeViews
  const { selectedNodes, selectedEdges } = networkViewModel ?? {}
  const selectedNodeCount: number = selectedNodes?.length ?? 0
  const selectedEdgeCount: number = selectedEdges?.length ?? 0
  const currNodes = currentNetwork?.nodes
  const currEdges = currentNetwork?.edges

  const handleClick = async (): Promise<void> => {
    if (selectedNodeCount > 0 && selectedNodeCount < MAX_SELECTED_OBJ &&
      selectedEdgeCount < MAX_SELECTED_OBJ) {
      const newNetworkId = uuidv4()
      const newNetworkWithView = await extractSubnetworkFromSelection(
        selectedNodes, selectedEdges, currNodes, currEdges, nodeTable, edgeTable, nodeViewModel, edgeViewModel, visualStyle, newNetworkId)

      // add new network to stores        
      addNetworkToWorkspace(newNetworkId);
      addNewNetwork(newNetworkWithView.network);
      setVisualStyle(newNetworkId, newNetworkWithView.visualStyle);
      setTables(newNetworkId, newNetworkWithView.nodeTable, newNetworkWithView.edgeTable);
      setViewModel(newNetworkId, newNetworkWithView.networkViews[0]);
      setCurrentNetworkId(newNetworkId)
    }
    else {
      alert('You must select some nodes/edges to create a subnetwork.');
    }
    handleClose();
  };

  return (
    <MenuItem onClick={handleClick}>
      Extract Subnetwork
    </MenuItem>
  );
};
