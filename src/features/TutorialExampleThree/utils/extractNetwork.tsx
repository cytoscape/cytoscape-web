import {
    putNetworkToDb,
    putTablesToDb,
    putVisualStyleToDb,
    putNetworkViewToDb,
    putNetworkSummaryToDb,
} from '../../../store/persist/db'
import { v4 as uuidv4 } from 'uuid'
import { IdType } from '../../../models/IdType'
import { NetworkWithView } from '../../../utils/cx-utils'
import TableFn, { Table } from '../../../models/TableModel'
import { ValueType } from '../../../models/TableModel/ValueType'
import { AttributeName } from '../../../models/TableModel/AttributeName'
import VisualStyleFn, { VisualStyle } from '../../../models/VisualStyleModel'
import ViewModelFn, { NodeView, EdgeView, NetworkView } from '../../../models/ViewModel'
import NetworkFn, { Network, NetworkAttributes, Node, Edge } from '../../../models/NetworkModel'

/**
 * extractSubnetworkFromSelection function:
 * This function extracts a subnetwork based on selected nodes and edges
 *
 * Props:
 * - selectedNodes: 
 * - selectedEdges: Attributes list of the edge table
 * - currNodes: A list of node objects in the current network
 * - currEdges: A list of edge objects in the current network
 * - nodeTable: The node table of the current network
 * - edgeTable: The edge table of the current network
 * - nodeViewModel: A map of nodeViews in the current network
 * - edgeViewModel: A map of edgeViews in the current network
 * - visualStyle: The visual style of the current network
 * - networkId: The uuid of the new network <optional>
 * - networkName: Name of the new network  <optional>
 * - networkDescription: Description of the new network <optional>
 * 
 * Returns:
 * - NetworkWithView: A collection of important properties in a network:
 *     ____________________________________________________________________________________________________________
 *    |      Network       | The Network topology                                                                  |
 *    | Network attributes | The Network attributes                                                                |
 *    |     Node table     | A 2-D array where each column represents an attribute and each row represents a node  |
 *    |     Edge table     | A 2-D array where each column represents an attribute and each row represents an edge |                    
 *    |    Visual style    | A map of visual property names to visual properties                                   |
 *    |    Network views   | The key-value pair storing what should be displayed in the actual visualizations      |
 *    |____________________________________________________________________________________________________________|
 */

export const extractSubnetworkFromSelection = async (
    selectedNodes: string[] | undefined,
    selectedEdges: string[] | undefined,
    currNodes: Node[] | undefined,
    currEdges: Edge[] | undefined,
    nodeTable: Table | undefined,
    edgeTable: Table | undefined,
    nodeViewModel: Record<IdType, NodeView> | undefined,
    edgeViewModel: Record<IdType, EdgeView> | undefined,
    visualStyle: VisualStyle | undefined,
    networkId?: string,
    networkName?: string,
    networkDescription?: string,
): Promise<NetworkWithView> => {

    // Todo: Check if id already exists
    // Generate network id and default its details if not specified
    const newNetworkId = networkId || uuidv4()
    const newNetworkName = networkName ?? "Extracted Network"
    const newNetworkDescription = networkDescription ?? "This is a extracted network from selected nodes and edges."
    const networkAttributes: NetworkAttributes = {
        id: newNetworkId,
        attributes: {},
    }
    // Initialize the new network and its visual style
    const newNetwork: Network = NetworkFn.createNetwork(newNetworkId)
    const newVisualStyle: VisualStyle = deepClone(visualStyle) || VisualStyleFn.createVisualStyle();
    const newNetworkView: NetworkView = ViewModelFn.createEmptyViewModel(newNetworkId)

    // Initialize tables for the new network
    const newNodeTable: Table = TableFn.createTable(newNetworkId, nodeTable?.columns)
    const newEdgeTable: Table = TableFn.createTable(newNetworkId, edgeTable?.columns)

    // Prepare containers for node and edge data to be added to the new network
    const nodeRowsToAdd: Array<[IdType, Record<AttributeName, ValueType>]> = [];
    const edgeRowsToAdd: Array<[IdType, Record<AttributeName, ValueType>]> = [];
    const nodeViewsToAdd: NodeView[] = []
    const edgeViewsToAdd: EdgeView[] = []

    // Process selected nodes and edges to prepare for inclusion in the new network
    selectedNodes?.forEach(nodeId => {
        if (nodeViewModel && nodeViewModel.hasOwnProperty(nodeId)) {
            nodeViewsToAdd.push({ ...nodeViewModel[nodeId] }); // Clone the node view
        }
        if (nodeTable?.rows.has(nodeId)) {
            nodeRowsToAdd.push([nodeId, nodeTable.rows.get(nodeId)!]);
        }
    });
    selectedEdges?.forEach(edgeId => {
        if (edgeViewModel && edgeViewModel.hasOwnProperty(edgeId)) {
            edgeViewsToAdd.push({ ...edgeViewModel[edgeId] }); // Clone the edge view
        }
        if (edgeTable?.rows.has(edgeId)) {
            edgeRowsToAdd.push([edgeId, edgeTable.rows.get(edgeId)!]);
        }
    });
    // check whether all the selected nodes/edges exist in nodeViewModel/edgeViewModel


    // Add nodes and edges to the new network
    const nodesToAdd: string[] = currNodes?.filter(node => selectedNodes?.includes(node.id)).map(node => node.id) || []
    const edgesToAdd: Edge[] = currEdges?.filter(edge => selectedEdges?.includes(edge.id)) || []
    NetworkFn.addNodes(newNetwork, nodesToAdd)
    NetworkFn.addEdges(newNetwork, edgesToAdd)

    // Incorporate views and table rows into the new network
    ViewModelFn.addNodeViewsToModel(newNetworkView, nodeViewsToAdd)
    ViewModelFn.addEdgeViewsToModel(newNetworkView, edgeViewsToAdd)
    TableFn.insertRows(newNodeTable, nodeRowsToAdd);
    TableFn.insertRows(newEdgeTable, edgeRowsToAdd);

    // Consolidate checks for missing nodes and edges in the network, node/edge tables, and view models.
    const missingNodeIdsInNetwork = selectedNodes?.filter(nodeId => !currNodes?.find(node => node.id === nodeId)) || [];
    const missingEdgeIdsInNetwork = selectedEdges?.filter(edgeId => !currEdges?.find(edge => edge.id === edgeId)) || [];
    const missingNodeIdsInView = selectedNodes?.filter(nodeId => !nodeViewModel?.hasOwnProperty(nodeId)) || [];
    const missingEdgeIdsInView = selectedEdges?.filter(edgeId => !edgeViewModel?.hasOwnProperty(edgeId)) || [];
    const missingNodeIdsInTable = selectedNodes?.filter(nodeId => !newNodeTable.rows.has(nodeId)) || [];
    const missingEdgeIdsInTable = selectedEdges?.filter(edgeId => !newEdgeTable.rows.has(edgeId)) || [];

    // Generate warnings based on missing elements, if any.
    if (missingNodeIdsInNetwork.length > 0) {
        console.warn(`Selected nodes missing in the current network: ${missingNodeIdsInNetwork.join(', ')}`);
    }
    if (missingEdgeIdsInNetwork.length > 0) {
        console.warn(`Selected edges missing in the current network: ${missingEdgeIdsInNetwork.join(', ')}`);
    }
    if (missingNodeIdsInView.length > 0) {
        console.warn(`Selected nodes not found in nodeViewModel: ${missingNodeIdsInView.join(', ')}`);
    }
    if (missingEdgeIdsInView.length > 0) {
        console.warn(`Selected edges not found in edgeViewModel: ${missingEdgeIdsInView.join(', ')}`);
    }
    if (missingNodeIdsInTable.length > 0 || missingEdgeIdsInTable.length > 0) {
        console.warn(`Node/Edge IDs not found in the original tables and were not added to the new tables:\n` +
            `Missing Node IDs: ${missingNodeIdsInTable.join(', ')}\n` +
            `Missing Edge IDs: ${missingEdgeIdsInTable.join(', ')}`);
    }

    // Persist the newly created network and its components to the database
    await putNetworkSummaryToDb({
        ownerUUID: newNetworkId,
        name: newNetworkName,
        isReadOnly: false,
        subnetworkIds: [],
        isValid: false,
        warnings: [],
        isShowcase: false,
        isCertified: false,
        indexLevel: '',
        hasLayout: true,
        hasSample: false,
        cxFileSize: 0,
        cx2FileSize: 0,
        properties: [],
        owner: '',
        version: '',
        completed: false,
        visibility: 'PUBLIC',
        nodeCount: selectedNodes?.length || 0,
        edgeCount: selectedEdges?.length || 0,
        description: newNetworkDescription,
        creationTime: new Date(Date.now()),
        externalId: newNetworkId,
        isDeleted: false,
        modificationTime: new Date(Date.now()),
    })
    await putNetworkToDb(newNetwork);
    await putTablesToDb(newNetworkId, newNodeTable, newEdgeTable);
    await putVisualStyleToDb(newNetworkId, newVisualStyle)
    await putNetworkViewToDb(newNetworkId, newNetworkView)

    return {
        network: newNetwork,
        nodeTable: newNodeTable,
        edgeTable: newEdgeTable,
        visualStyle: newVisualStyle,
        networkViews: [newNetworkView],
        networkAttributes,
    }
}

// Utility function for deep cloning objects that may contain arrays, maps, and functions
function deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (obj instanceof Map) {
        // Create a new Map by iterating over the original one and cloning the keys and values
        return new Map(Array.from(obj.entries()).map(([key, value]) =>
            [key, deepClone(value)])) as unknown as T;
    }

    if (obj instanceof Function) {
        // Clone the function
        return ((...args: any[]) => (obj as Function)(...args)) as unknown as T;
    }

    if (obj instanceof Array) {
        // Clone the array
        return obj.map((item) => deepClone(item)) as unknown as T;
    }

    if (obj instanceof Object) {
        // Clone the object
        const cloneO = {} as T;
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                (cloneO as any)[key] = deepClone((obj as any)[key]);
            }
        }
        return cloneO;
    }

    throw new Error('Unable to copy object!');
}
