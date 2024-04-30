import { IdType } from "../../models/IdType";
import TableFn from "../../models/TableModel";
import { NetworkRecord } from "./model/DataInterfaceForMerge";
import { Node } from "../../models/NetworkModel";
import { Column } from "../../models/TableModel/Column";
import { ValueType } from "../../models/TableModel/ValueType";
import { valueMatcher } from "./utils/AttrValueMatcher";

export function mergeNetwork(fromNetworks: IdType[], toNetworkId: IdType, networkRecords: Record<IdType, NetworkRecord>,
    nodeAttributeMapping: Record<IdType, Map<IdType, IdType>>, edgeAttributeMapping: Record<IdType, Map<IdType, IdType>>,
    networkAttributeMapping: Record<IdType, Map<IdType, IdType>>, matchingAttribute: Record<IdType, Column>) {
    if (fromNetworks.length < 2) {
        throw new Error("No networks to merge");
    }
    // preprocess the network to merge    
    const { mergedNodeTable, mergedEdgeTable } = preprocess(toNetworkId);

    // clone the base network
    const nodeValueMap: Map<IdType, ValueType> = cloneNetwork(fromNetworks[0], toNetworkId);

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
        network: toNetwork,
        nodeTable: mergedNodeTable,
        edgeTable: mergedEdgeTable

    }
}


function preprocess(toNetwork: IdType) {
    const mergedNodeTable = TableFn.createTable(toNetwork, this.nodeAttributeMapping.getMergedColumns());
    const mergedEdgeTable = TableFn.createTable(toNetwork, this.edgeAttributeMapping.getMergedColumns());
    return {
        mergedNodeTable,
        mergedEdgeTable
    }
}

function cloneNetwork(fromNetwork: IdType, toNetwork: IdType) {
    const nodeTable = TableFn.createTable(fromNetwork, this.nodeAttributeMapping.getMergedColumns())
    const edgeTable = TableFn.createTable(fromNetwork, this.edgeAttributeMapping.getMergedColumns());
    for (const node of nodeTable.rows) {
        this.nodeAttributeMapping.mapToGOAttr.set(node[1], node[0]);
    }
    for (const edge of edgeTable.rows) {
        this.edgeAttributeMapping.mapToGOAttr.set(edge[1], edge[0]);
    }
}