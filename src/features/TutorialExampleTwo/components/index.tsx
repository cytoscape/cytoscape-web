import { v4 as uuidv4 } from 'uuid';
import { ReactElement } from 'react';
import { MenuItem } from '@mui/material';
import { BaseMenuProps } from '../../../components/ToolBar/BaseMenuProps';
import { createEmptyNetworkWithView,
          addNodeToNetwork } from '../utils/createNetwork';
import { useTableStore } from '../../../store/TableStore'
import { useNetworkStore } from '../../../store/NetworkStore';
import { useWorkspaceStore } from '../../../store/WorkspaceStore';
import { useViewModelStore } from '../../../store/ViewModelStore';
import { useVisualStyleStore } from '../../../store/VisualStyleStore'

export const ExampleTwoMenuItem = ({ handleClose }: BaseMenuProps ): ReactElement => {
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

    const handleClick = async (): Promise<void> => {
        try{
          const newNetworkUuid = uuidv4();          
          await createEmptyNetworkWithView(newNetworkUuid);
          const addNodeResOne = await addNodeToNetwork({networkId:newNetworkUuid,nodeId:1,x:0,y:1});
          const addNodeResTwo = await addNodeToNetwork({networkId:newNetworkUuid,nodeId:2,x:1,y:0});
          // Ensure addNodeResult is not undefined before destructuring
          if (addNodeResOne !== undefined && addNodeResTwo !== undefined) {
            const [newNetworkModel] = addNodeResTwo;
            addNetworkToWorkspace(newNetworkUuid);
            addNewNetwork(newNetworkModel.network);
            setVisualStyle(newNetworkUuid, newNetworkModel.visualStyle);
            setTables(newNetworkUuid, newNetworkModel.nodeTable, newNetworkModel.edgeTable);
            setViewModel(newNetworkUuid, newNetworkModel.networkViews[0]);
            setCurrentNetworkId(newNetworkUuid);
            handleClose();

          }
        } catch (error) {
          console.error(error)
        }
    };

    

    return (
    <MenuItem onClick={handleClick}>
      Create a Sample Network
    </MenuItem>
  );
};
