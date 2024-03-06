import NetworkFn, { Network, NetworkAttributes, Node, Edge } from '../../../models/NetworkModel'
import {
    translateCXEdgeId,
    translateEdgeIdToCX
} from '../../../models/NetworkModel/impl/CyNetwork'
import { IdType } from '../../../models/IdType'
import TableFn, { Column, Table } from '../../../models/TableModel'
import ViewModelFn, { NodeView, EdgeView, NetworkView } from '../../../models/ViewModel'
import VisualStyleFn, { VisualStyle } from '../../../models/VisualStyleModel'
import { AttributeName } from '../../../models/TableModel/AttributeName'
import { ValueType } from '../../../models/TableModel/ValueType'
import { NetworkWithView, getCachedData } from '../../../utils/cx-utils'
import { v4 as uuidv4 } from 'uuid'
import { Attribute } from '../../../models/CxModel/Cx2/CoreAspects/Attribute'
import {
    putNetworkToDb,
    putTablesToDb,
    putVisualStyleToDb,
    putNetworkViewToDb,
    putNetworkSummaryToDb,
} from '../../../store/persist/db'

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

    // Todo:check if id already exists

    const newNetworkId = networkId || uuidv4()

    const newNetworkName = networkName ?? "Extracted Network"
    const newNetworkDescription = networkDescription ?? "This is a extracted network from selected nodes and edges."

    const newNetwork: Network = NetworkFn.createNetwork(newNetworkId)
    const newVisualStyle: VisualStyle = JSON.parse(JSON.stringify(visualStyle)) || VisualStyleFn.createVisualStyle();
    const newNetworkView: NetworkView = ViewModelFn.createEmptyViewModel(newNetworkId)

    // initialize tables
    const newNodeTable: Table = TableFn.createTable(newNetworkId, nodeTable?.columns)
    const newEdgeTable: Table = TableFn.createTable(newNetworkId, edgeTable?.columns)
    const nodeRowsToAdd: Array<[IdType, Record<AttributeName, ValueType>]> = [];
    const edgeRowsToAdd: Array<[IdType, Record<AttributeName, ValueType>]> = [];

    // add nodes and edges to network
    selectedNodes?.forEach(nodeId => { })

    // initialize nodeView and edgeView that waits to be added to networkViewModel
    const nodeViewsToAdd: NodeView[] = []
    const edgeViewsToAdd: EdgeView[] = []

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
    if (nodeViewsToAdd.length !== (selectedNodes?.length || 0) ||
        edgeViewsToAdd.length !== (selectedEdges?.length || 0)) {
        console.warn('Some selected nodes/edges were not found in nodeViewModel/edgeViewModel and were not added to the new network viewModel:')
    }

    //
    const nodesToAdd: string[] = currNodes?.filter(node => selectedNodes?.includes(node.id)).map(node => node.id) || []
    if (nodesToAdd.length !== (selectedNodes?.length || 0)) {
        console.warn('SeletedNodes contains nodes that are not included in the current network.')
    }
    const edgesToAdd: Edge[] = currEdges?.filter(edge => selectedEdges?.includes(edge.id)) || []
    NetworkFn.addNodes(newNetwork, nodesToAdd)
    NetworkFn.addEdges(newNetwork, edgesToAdd)

    // add nodeViews and edgeViews to networkView
    ViewModelFn.addNodeViewsToModel(newNetworkView, nodeViewsToAdd)
    ViewModelFn.addEdgeViewsToModel(newNetworkView, edgeViewsToAdd)

    // insert nodes and edges to tables
    TableFn.insertRows(newNodeTable, nodeRowsToAdd);
    TableFn.insertRows(newEdgeTable, edgeRowsToAdd);

    // check whether all the selected nodes/edges exist in nodeTable/edgeTable
    const missingNodeIds = selectedNodes?.filter(nodeId => !newNodeTable.rows.has(nodeId)) || [];
    const missingEdgeIds = selectedEdges?.filter(edgeId => !newEdgeTable.rows.has(edgeId)) || [];
    if (missingNodeIds.length > 0 || missingEdgeIds.length > 0) {
        console.warn("The following node/edge IDs were not found in the original node table and were not added to the new node table: \n Node ID:",
            missingNodeIds, '\n Edge ID:', missingEdgeIds);
    }

    // network attribute
    const networkAttributes: NetworkAttributes = {
        id: newNetworkId,
        attributes: {},
    }

    // save to Database
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
        hasLayout: false,
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