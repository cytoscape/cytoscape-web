import { v4 as uuidv4 } from 'uuid';
import { ReactElement } from 'react';
import { MenuItem } from '@mui/material';
import { IdType } from '../../../models/IdType'
import { Column } from '../../../models/TableModel'
import { useTableStore } from '../../../store/TableStore'
import { useLayoutStore } from '../../../store/LayoutStore';
import { useNetworkStore } from '../../../store/NetworkStore';
import { ValueType } from '../../../models/TableModel/ValueType';
import { putNetworkSummaryToDb } from '../../../store/persist/db';
import { useWorkspaceStore } from '../../../store/WorkspaceStore';
import { useViewModelStore } from '../../../store/ViewModelStore';
import { useVisualStyleStore } from '../../../store/VisualStyleStore';
import { ValueTypeName } from '../../../models/TableModel/ValueTypeName';
import { AttributeName } from '../../../models/TableModel/AttributeName';
import { BaseMenuProps } from '../../../components/ToolBar/BaseMenuProps';
import { LayoutAlgorithm, LayoutEngine } from '../../../models/LayoutModel'
import {
  createEmptyNetworkWithView, DEFAULT_ATTRIBUTE,
  createNodeView, createEdgeView
} from '../utils/createNewNetwork';
import { VisualPropertyGroup } from '../../../models/VisualStyleModel/VisualPropertyGroup';

// Define default columns for demo edge and node tables
const DEMO_EDGE_TABLE_COLUMN: Column = {
  name: DEFAULT_ATTRIBUTE,
  type: ValueTypeName.String
};
const DEMO_NODE_TABLE_COLUMN: Column = {
  name: DEFAULT_ATTRIBUTE,
  type: ValueTypeName.String
};

/**
 * TutorialMenuItemTwo component:
 * This component creates an example network with two nodes and one edge.
 *
 * Props:
 * - handleClose: A function from the parent component that will be called to close the menu.
 */

export const TutorialMenuItemTwo = ({ handleClose }: BaseMenuProps): ReactElement => {
  // Define constants and hooks for network and node IDs
  const nodeOneId = '1';
  const nodeTwoId = '2';
  const edgeId = 'e1';
  const NODE_TYPE = VisualPropertyGroup.Node
  const EDGE_TYPE = VisualPropertyGroup.Edge
  const newNetworkUuid = uuidv4();

  // Use custom hooks for state management across different stores
  const { addNewNetwork, addNodesToNetwork, addEdgeToNetwork } = useNetworkStore((state) => ({
    addNewNetwork: state.add,
    addNodesToNetwork: state.addNodes,
    addEdgeToNetwork: state.addEdge,
  }));
  const addNodeViews = useViewModelStore((state) => state.addNodeViews)
  const addEdgeView = useViewModelStore((state) => state.addEdgeView)
  const setVisualStyle = useVisualStyleStore((state) => state.add)
  const setViewModel = useViewModelStore((state) => state.add)
  const setTables = useTableStore((state) => state.add)
  const addRowsToTable = useTableStore((state) => state.addRows)
  const addRowToTable = useTableStore((state) => state.addRow)
  const addNetworkToWorkspace = useWorkspaceStore(
    (state) => state.addNetworkIds,
  )
  const setCurrentNetworkId = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )

  // Layout setting using the layout store
  const defaultLayout: LayoutAlgorithm = useLayoutStore(
    (state) => state.preferredLayout,
  )
  const setIsRunning: (isRunning: boolean) => void = useLayoutStore(
    (state) => state.setIsRunning,
  )
  const layoutEngines: LayoutEngine[] = useLayoutStore(
    (state) => state.layoutEngines,
  )
  const engine: LayoutEngine =
    layoutEngines.find((engine) => engine.name === defaultLayout.engineName) ??
    layoutEngines[0]

  const updateNodePositions: ( // Function to update node positions after layout is applied
    networkId: IdType,
    positions: Map<IdType, [number, number, number?]>,
  ) => void = useViewModelStore((state) => state.updateNodePositions)

  const afterLayout = (positionMap: Map<IdType, [number, number]>): void => {
    updateNodePositions(newNetworkUuid, positionMap)
    setIsRunning(false)
  }

  const handleClick = async (): Promise<void> => {
    /**
     * handleClick function:
     * This function is called when the menu item is clicked.
     * It firstly creates an empty networkWithView, 
     * then it adds two nodes and one edge to the network and applies the defualt layout.
     * Finally, it updates network views, tables, and the summary.
     */
    try {
      // Create a new network with specified node and edge attributes      
      const [newNetworkWithView, newNetworkSummary] = await createEmptyNetworkWithView([DEMO_NODE_TABLE_COLUMN],
        [DEMO_EDGE_TABLE_COLUMN], newNetworkUuid);

      // Update state stores with the new network and its components   
      addNetworkToWorkspace(newNetworkUuid);
      addNewNetwork(newNetworkWithView.network);
      setVisualStyle(newNetworkUuid, newNetworkWithView.visualStyle);
      setTables(newNetworkUuid, newNetworkWithView.nodeTable, newNetworkWithView.edgeTable);
      setViewModel(newNetworkUuid, newNetworkWithView.networkViews[0]);
      setCurrentNetworkId(newNetworkUuid)

      // Add nodes and an edge to the network
      addNodesToNetwork(newNetworkUuid, [nodeOneId, nodeTwoId])
      addEdgeToNetwork(newNetworkUuid, edgeId, nodeOneId, nodeTwoId)

      // Apply layout to the network
      setIsRunning(true)
      engine.apply(newNetworkWithView.network.nodes,
        newNetworkWithView.network.edges, afterLayout, defaultLayout)

      // Update tables with node and edge attributes
      const nodeAttr: Array<[IdType, Record<AttributeName, ValueType>]>
        = [[nodeOneId, { [DEFAULT_ATTRIBUTE]: NODE_TYPE + nodeOneId }],
        [nodeTwoId, { [DEFAULT_ATTRIBUTE]: NODE_TYPE + nodeTwoId }]];
      const edgeAttr: [IdType, Record<AttributeName, ValueType>]
        = [edgeId, { [DEFAULT_ATTRIBUTE]: edgeId }];
      addRowsToTable(newNetworkUuid, NODE_TYPE, nodeAttr)
      addRowToTable(newNetworkUuid, EDGE_TYPE, edgeAttr)

      // Add views for nodes and the edge
      const nodeViewOne = createNodeView({ nodeId: nodeOneId, x: 1, y: 0 })
      const nodeViewTwo = createNodeView({ nodeId: nodeTwoId, x: 1, y: 0 })
      const edgeView = createEdgeView(edgeId)
      addNodeViews(newNetworkUuid, [nodeViewOne, nodeViewTwo])
      addEdgeView(newNetworkUuid, edgeView)

      // Update network summary and persist to the database
      await putNetworkSummaryToDb({
        ...newNetworkSummary,
        nodeCount: 2, edgeCount: 1, hasLayout: true, modificationTime: new Date(Date.now()),
      })

      // Close the menu item after operations are complete
      handleClose();
    } catch (error) {
      console.error(error)
    }
  };

  // Render a MenuItem that triggers network creation on click
  return (
    <MenuItem onClick={handleClick}>
      Create Example Network
    </MenuItem>
  );
};
