import { v4 as uuidv4 } from 'uuid';
import { ReactElement } from 'react';
import { MenuItem } from '@mui/material';
import { BaseMenuProps } from '../../../components/ToolBar/BaseMenuProps';
import { createEmptyNetworkWithView,
          addNodeToNetwork, 
          addEdgeToNetwork,
          DEFAULT_ATTRIBUTE } from '../utils/createNetwork';
import { useTableStore } from '../../../store/TableStore'
import { Column } from '../../../models/TableModel'
import { useNetworkStore } from '../../../store/NetworkStore';
import { useWorkspaceStore } from '../../../store/WorkspaceStore';
import { useViewModelStore } from '../../../store/ViewModelStore';
import { useVisualStyleStore } from '../../../store/VisualStyleStore';
import { ValueTypeName } from '../../../models/TableModel/ValueTypeName';

const DEMO_EDGE_TABLE_COLUMN: Column = {
  name: DEFAULT_ATTRIBUTE,
  type: ValueTypeName.String
};
const DEMO_NODE_TABLE_COLUMN: Column = {
  name: DEFAULT_ATTRIBUTE,
  type: ValueTypeName.String
};

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
          await createEmptyNetworkWithView(newNetworkUuid,[DEMO_NODE_TABLE_COLUMN],[DEMO_EDGE_TABLE_COLUMN]);
          const addNodeOneRes = await addNodeToNetwork({networkId:newNetworkUuid,nodeId:1,x:0,y:1});
          const addNodeTwoRes = await addNodeToNetwork({networkId:newNetworkUuid,nodeId:2,x:1,y:0});
          // Ensure addNodeResult is not undefined before destructuring
          if (addNodeOneRes !== undefined && addNodeTwoRes !== undefined) {
            const [,nodeOneId] = addNodeOneRes;
            const [,nodeTwoId] = addNodeTwoRes;
            const addEdgeRes = await addEdgeToNetwork(newNetworkUuid,nodeOneId,nodeTwoId);
            if (addEdgeRes!==undefined){
              const [newNetworkModel] = addEdgeRes;
              addNetworkToWorkspace(newNetworkUuid);
              addNewNetwork(newNetworkModel.network);
              setVisualStyle(newNetworkUuid, newNetworkModel.visualStyle);
              setTables(newNetworkUuid, newNetworkModel.nodeTable, newNetworkModel.edgeTable);
              setViewModel(newNetworkUuid, newNetworkModel.networkViews[0]);
              setCurrentNetworkId(newNetworkUuid);
              handleClose();              
            }

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
