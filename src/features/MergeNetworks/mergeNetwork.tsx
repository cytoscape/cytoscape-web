import { IdType } from "../../models/IdType";
import TableFn from "../../models/TableModel";
import { NetworkRecord } from "./model/DataInterfaceForMerge";
import NetworkFn, { Network, Node } from "../../models/NetworkModel";
import { Column } from "../../models/TableModel/Column";
import { ValueType } from "../../models/TableModel/ValueType";
import { valueMatcher } from "./utils/AttrValueMatcher";
import { MatchingTable } from "./model/Impl/MatchingTable";
import { cloneNetwork } from "./utils/cloneNetwork";
import { mergeAttributes } from "./utils/mergeAttributes";

export function mergeNetwork(fromNetworks: IdType[], toNetworkId: IdType, networkRecords: Record<IdType, NetworkRecord>,
    nodeAttributeMapping: MatchingTable, edgeAttributeMapping: MatchingTable, networkAttributeMapping: MatchingTable, matchingAttribute: Record<IdType, Column>) {
    if (fromNetworks.length < 2) {
        throw new Error("No networks to merge");
    }
    // preprocess the network to merge    
    const { mergedNodeTable, mergedEdgeTable } = preprocess(toNetworkId, nodeAttributeMapping.getMergedAttributes(), edgeAttributeMapping.getMergedAttributes());

    // clone the base network
    const baseNetworkID = fromNetworks[0];
    // clone the network iteself
    const mergedNetwork: Network = NetworkFn.createNetworkFromLists(toNetworkId, [...networkRecords[baseNetworkID].network.nodes], [...networkRecords[baseNetworkID].network.edges])
    //clone the table rows(columns have already been initialized in the preprocess step)

    TableFn.insertRows(mergedNodeTable, [...networkRecords[baseNetworkID].nodeTable.rows.entries()]);
    TableFn.insertRows(mergedEdgeTable, [...networkRecords[baseNetworkID].edgeTable.rows.entries()]);

    // map the node id in the mergedNetwork to the node id in the fromNetworks
    const nodeIdMap = new Map<IdType, Record<IdType, IdType>>();
    const nodeIdSet = new Set<IdType>(); // prevent duplicate nodes
    for (const node of networkRecords[baseNetworkID].network.nodes) {
        nodeIdMap.set(node.id, { baseNetworkID: node.id });
        if (nodeIdSet.has(node.id)) {
            throw new Error(`Duplicate node id found in the network:${baseNetworkID}`);
        }
        nodeIdSet.add(node.id);
    }
    // merge nodes
    // loop over the networks to merge (the first network is base network)
    for (const netToMerge of fromNetworks.slice(1)) {
        // get the nodes of the network to merge
        const nodeLst: Node[] = networkRecords[netToMerge].network.nodes;
        if (nodeLst.length !== new Set(nodeLst).size) {
            throw new Error(`Duplicate nodes found in the network:${netToMerge}`);
        }

        // record the matched and unmatched nodes
        const matchedNodeIds: [IdType, IdType][] = [];
        const unmatchedNodeIds: IdType[] = [];
        // loop over the nodes of the network to merge
        for (const nodeObj of nodeLst) {
            const nodeId = nodeObj.id;
            const matchedNodeId = valueMatcher(nodeId, toNetworkId);
            if (matchedNodeId === -1) { // if the node is not in the network
                unmatchedNodeIds.push(nodeId);
            }
            else {
                matchedNodeIds.push([matchedNodeId, nodeId]);
            }
        }

        // unmatched nodes
        for (const nodeId of unmatchedNodeIds) {
            let newNodeId = nodeId
            if (nodeIdSet.has(nodeId)) {
                newNodeId = generateId();
            }
            nodeIdMap.set(newNodeId, { netToMerge: nodeId });
            nodeIdSet.add(newNodeId);
            NetworkFn.addNode(mergedNetwork, newNodeId);
            const nodeRecord = networkRecords[netToMerge].nodeTable.rows.get(nodeId);
            if (nodeRecord === undefined) {
                throw new Error("Node not found in the node table");
            }
            TableFn.insertRow(mergedNodeTable, [newNodeId, nodeRecord]);
        }

        //matched nodes
        for (const [oriNodeId, newNodeId] of matchedNodeIds) {
            nodeIdMap.set(oriNodeId, { ...nodeIdMap.get(oriNodeId), netToMerge: newNodeId });
            const nodeRecord = networkRecords[netToMerge].nodeTable.rows.get(oriNodeId);
            const oriRow = mergedNodeTable.rows.get(oriNodeId);
            if (nodeRecord === undefined || oriRow === undefined) {
                throw new Error("Node not found in the node table");
            }
            //update the row
            Object.entries(nodeRecord).forEach((entry: [string, ValueType]) => {
                oriRow.set(entry[0], entry[1]);
            });
            // update the mergedNodeTable
            TableFn.updateRow(mergedNodeTable, [oriNodeId, oriRow]);
        }
        TableFn.insertRows(mergedNodeTable, [...networkRecords[netToMerge].nodeTable.rows.entries()]);

    }

    // merge edges


    return {
        network: mergedNetwork,
        nodeTable: mergedNodeTable,
        edgeTable: mergedEdgeTable

    }
}


function preprocess(toNetwork: IdType, nodeCols: Column[], edgeCols: Column[]) {
    const mergedNodeTable = TableFn.createTable(toNetwork, nodeCols);
    const mergedEdgeTable = TableFn.createTable(toNetwork, edgeCols);
    return {
        mergedNodeTable,
        mergedEdgeTable
    }
}

function generateId(): IdType {
    return `${Math.floor(Math.random() * 1000000000)}` as IdType;
} 