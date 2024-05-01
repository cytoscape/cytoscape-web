import { IdType } from "../../models/IdType";
import TableFn from "../../models/TableModel";
import { NetworkRecord } from "./model/DataInterfaceForMerge";
import NetworkFn, { Network, Node } from "../../models/NetworkModel";
import { Column } from "../../models/TableModel/Column";
import { ValueType } from "../../models/TableModel/ValueType";
import { valueMatcher } from "./utils/AttrValueMatcher";
import { MatchingTable } from "./model/Impl/MatchingTable";
import { cloneNetwork } from "./utils/cloneNetwork";

export function mergeNetwork(fromNetworks: IdType[], toNetworkId: IdType, networkRecords: Record<IdType, NetworkRecord>,
    nodeAttributeMapping: MatchingTable, edgeAttributeMapping: MatchingTable,
    networkAttributeMapping: MatchingTable, matchingAttribute: Record<IdType, Column>) {
    if (fromNetworks.length < 2) {
        throw new Error("No networks to merge");
    }
    // preprocess the network to merge    
    const { mergedNodeTable, mergedEdgeTable } = preprocess(toNetworkId, nodeAttributeMapping.getMergedAttributes(), edgeAttributeMapping.getMergedAttributes());

    // clone the base network
    const baseNetworkID = fromNetworks[0];
    // clone the network iteself
    const mergedNetwork: Network = NetworkFn.createNetwork(toNetworkId)//cloneNetwork(baseNetworkID, toNetworkId);
    // clone the table rows (columns have already been initialized in the preprocess step)
    TableFn.insertRows(mergedNodeTable, [...networkRecords[baseNetworkID].nodeTable.rows.entries()]);
    TableFn.insertRows(mergedEdgeTable, [...networkRecords[baseNetworkID].edgeTable.rows.entries()]);

    // export const insertRows = (
    //     table: Table,
    //     idRowPairs: Array<[IdType, Record<AttributeName, ValueType>]>,
    //   ): Table => {
    //     idRowPairs.forEach((idRow) => table.rows.set(idRow[0], idRow[1]))
    //     return table
    //   }

    // merge nodes
    // loop over the networks to merge (the first network is base network)
    for (const netToMerge of fromNetworks.slice(1)) {
        // get the nodes of the network to merge
        const nodeLst: Node[] = networkRecords[netToMerge].network.nodes;

        const matchedNodeId: IdType[] = [];
        const unmatchedNodeId: IdType[] = [];
        // loop over the nodes of the network to merge
        for (const nodeObj of nodeLst) {
            const nodeId = nodeObj.id;
            const matchedNodeId = valueMatcher(nodeId, toNetworkId);
            if (matchedNodeId === -1) { // if the node is not in the network
                unmatchedNodeId.push(nodeId);
            }
            else {
                matchedNodeId.push(nodeId);
            }
        }
    }


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