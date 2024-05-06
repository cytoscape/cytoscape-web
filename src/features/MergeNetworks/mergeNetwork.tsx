import { IdType } from "../../models/IdType";
import TableFn from "../../models/TableModel";
import { NetworkRecord } from "./model/DataInterfaceForMerge";
import NetworkFn, { Network, Node } from "../../models/NetworkModel";
import { Column } from "../../models/TableModel/Column";
import { ValueType } from "../../models/TableModel/ValueType";
import { attributeValueMatcher } from "./utils/valueMatcher";
import { MatchingTable } from "./model/Impl/MatchingTable";
import { cloneNetwork } from "./utils/cloneNetwork";
import { mergeAttributes } from "./utils/mergeAttributes";

export function mergeNetwork(fromNetworks: IdType[], toNetworkId: IdType, networkRecords: Record<IdType, NetworkRecord>,
    nodeAttributeMapping: MatchingTable, edgeAttributeMapping: MatchingTable, networkAttributeMapping: MatchingTable, matchingAttribute: Record<IdType, Column>) {
    const nodeMergedAttributes = nodeAttributeMapping.getMergedAttributes()
    const edgeMergedAttributes = edgeAttributeMapping.getMergedAttributes()
    const reversedAttMap = nodeAttributeMapping.getReversedMergedAttMap()
    const mergedAttName = nodeMergedAttributes[0].name
    // preprocess the network to merge    
    const { mergedNodeTable, mergedEdgeTable } = preprocess(toNetworkId, nodeMergedAttributes, edgeMergedAttributes);
    // clone the base network
    const baseNetworkID = fromNetworks[0];
    // clone the network iteself
    const mergedNetwork: Network = NetworkFn.createNetwork(toNetworkId)
    // reset all the node and edge ids, starting from 0
    let globalNodeId = 0;
    let globalEdgeId = 0;
    //initialize the node and edge rows
    const initialNodeRows: [string, Record<string, ValueType>][] = []
    const initialEdgeRows: [string, Record<string, ValueType>][] = []
    // map the node id in the mergedNetwork to the node id in the fromNetworks
    const nodeIdMap = new Map<IdType, Record<IdType, IdType>>();
    const nodeIdSet = new Set<IdType>(); // prevent duplicate nodes
    const nodeAttMap = new Map<IdType, ValueType>();

    networkRecords[baseNetworkID].nodeTable.rows.forEach((entry, oriId) => {
        const newNodeId: string = `${globalNodeId++}`;
        nodeIdMap.set(newNodeId, { baseNetworkID: oriId });
        if (nodeIdSet.has(newNodeId)) {
            throw new Error(`Duplicate node id found in the network:${baseNetworkID}`);
        }
        nodeIdSet.add(newNodeId);
        if (entry === undefined) {
            throw new Error("Node not found in the node table");
        }
        nodeAttMap.set(newNodeId, entry[matchingAttribute[baseNetworkID].name] as ValueType);
        initialNodeRows.push([newNodeId,
            addMergedAtt(castAttributes(entry, nodeAttributeMapping.getAttributeMapping(baseNetworkID)), entry,
                mergedAttName, reversedAttMap.get(baseNetworkID) as string)])
        NetworkFn.addNode(mergedNetwork, newNodeId);
    });
    networkRecords[baseNetworkID].edgeTable.rows.forEach((entry, id) => {
        initialEdgeRows.push([id, castAttributes(entry, edgeAttributeMapping.getAttributeMapping(baseNetworkID))])
    });
    //clone the table rows(columns have already been initialized in the preprocess step)
    TableFn.insertRows(mergedNodeTable, initialNodeRows);
    TableFn.insertRows(mergedEdgeTable, initialEdgeRows);

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
            const nodeRecord = networkRecords[netToMerge].nodeTable.rows.get(nodeId);
            if (nodeRecord === undefined) {
                throw new Error("Node not found in the node table");
            }
            const matchedNodeId = attributeValueMatcher(nodeRecord[matchingAttribute[netToMerge].name], nodeAttMap);
            if (!matchedNodeId) { // if the node is not in the network
                unmatchedNodeIds.push(nodeId);
            }
            else {
                matchedNodeIds.push([matchedNodeId, nodeId]);
            }
        }

        // unmatched nodes
        for (const nodeId of unmatchedNodeIds) {
            const newNodeId: string = `${globalNodeId++}`;
            nodeIdMap.set(newNodeId, { netToMerge: nodeId });
            nodeIdSet.add(newNodeId);
            NetworkFn.addNode(mergedNetwork, newNodeId);
            const nodeRecord = networkRecords[netToMerge].nodeTable.rows.get(nodeId);
            if (nodeRecord === undefined) {
                throw new Error("Node not found in the node table");
            }
            TableFn.insertRow(mergedNodeTable, [newNodeId,
                addMergedAtt(castAttributes(nodeRecord, nodeAttributeMapping.getAttributeMapping(netToMerge)), nodeRecord,
                    mergedAttName, reversedAttMap.get(netToMerge) as string)]);
        }

        //matched nodes
        for (const [oriNodeId, newNodeId] of matchedNodeIds) {
            nodeIdMap.set(oriNodeId, { ...nodeIdMap.get(oriNodeId), netToMerge: newNodeId });
            const nodeRecord = networkRecords[netToMerge].nodeTable.rows.get(newNodeId);
            const oriRow = mergedNodeTable.rows.get(oriNodeId);
            if (nodeRecord === undefined || oriRow === undefined) {
                throw new Error("Node not found in the node table");
            }
            const castedRecord = castAttributes(nodeRecord, nodeAttributeMapping.getAttributeMapping(netToMerge));
            //update the row
            Object.entries(castedRecord).forEach((entry: [string, ValueType]) => {
                if (!oriRow.hasOwnProperty(entry[0])) {
                    oriRow[entry[0]] = entry[1];
                }
            });
            // update the mergedNodeTable
            TableFn.updateRow(mergedNodeTable, [oriNodeId, oriRow]);
        }

    }

    // merge edges



    // Todo: merge nodes/edges in the same network
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

function castAttributes(toMergeAttr: Record<string, ValueType>, attributeMapping: Map<string, Column>): Record<string, ValueType> {
    const castedAttr: Record<string, ValueType> = {};
    for (const [key, value] of Object.entries(toMergeAttr)) {
        const col = attributeMapping.get(key);
        if (col === undefined) {
            throw new Error(`Attribute ${key} not found in the attribute mapping`);
        }
        castedAttr[col.name] = value;
    }
    // Todo: type coercion
    return castedAttr;
}

function addMergedAtt(castedRecord: Record<string, ValueType>, oriRecord: Record<string, ValueType>, mergedAttName: string, translatedAtt: string): Record<string, ValueType> {
    if (translatedAtt === undefined) {
        throw new Error("Cannot find the translated attribute in the original network");
    }
    const attVal = oriRecord[translatedAtt];
    if (attVal === undefined) {
        throw new Error("Cannot find the merged attribute in the original network");
    }
    castedRecord[mergedAttName] = attVal;
    return castedRecord;

}