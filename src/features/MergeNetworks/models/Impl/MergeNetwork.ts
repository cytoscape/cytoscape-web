import { IdType } from "../../../../models/IdType";
import TableFn from "../../../../models/TableModel";
import { NetworkRecord } from "../DataInterfaceForMerge";
import NetworkFn, { Edge, Network, Node } from "../../../../models/NetworkModel";
import { Column } from "../../../../models/TableModel/Column";
import { ValueType } from "../../../../models/TableModel/ValueType";
import { attributeValueMatcher } from "../../utils/attributes-operations";
import { MatchingTable } from "../MatchingTable";
import { getMergedAttributes, getAttributeMapping, getReversedMergedAttMap } from "./MatchingTableImpl";
import { preprocess, castAttributes, addMergedAtt } from "../../utils/attributes-operations";

export function mergeNetwork(fromNetworks: IdType[], toNetworkId: IdType, networkRecords: Record<IdType, NetworkRecord>,
    nodeAttributeMapping: MatchingTable, edgeAttributeMapping: MatchingTable, networkAttributeMapping: MatchingTable, matchingAttribute: Record<IdType, Column>) {
    const nodeMergedAttributes = getMergedAttributes(nodeAttributeMapping)
    const edgeMergedAttributes = getMergedAttributes(edgeAttributeMapping)
    const reversedAttMap = getReversedMergedAttMap(nodeAttributeMapping)
    const mergedAttName = nodeMergedAttributes[0].name
    // preprocess the network to merge    
    const { mergedNodeTable, mergedEdgeTable } = preprocess(toNetworkId, nodeMergedAttributes, edgeMergedAttributes);
    // clone the base network
    const baseNetworkId = fromNetworks[0];
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
    // map the node id in the fromNetworks to the mergedNetwork 
    const node2nodeMap = new Map<string, IdType>();
    const nodeIdSet = new Set<IdType>(); // prevent duplicate nodes
    const edgeIdSet = new Set<IdType>(); // prevent duplicate edges
    const nodeAttMap = new Map<IdType, ValueType>();
    // record the edge
    const edgeMap = new Map<string, IdType>();

    networkRecords[baseNetworkId]?.nodeTable.rows.forEach((entry, oriId) => {
        const newNodeId: string = `${globalNodeId++}`;
        nodeIdMap.set(newNodeId, { baseNetworkID: oriId }); // todo: delete this line?
        node2nodeMap.set(`${baseNetworkId}-${oriId}`, newNodeId);
        if (nodeIdSet.has(oriId)) {
            throw new Error(`Duplicate node id found in the network:${baseNetworkId}`);
        }
        nodeIdSet.add(oriId);
        if (entry === undefined) {
            throw new Error("Node not found in the node table");
        }
        nodeAttMap.set(newNodeId, entry[matchingAttribute[baseNetworkId].name] as ValueType);
        initialNodeRows.push([newNodeId,
            addMergedAtt(castAttributes(entry, getAttributeMapping(nodeAttributeMapping, baseNetworkId)), entry,
                mergedAttName, reversedAttMap.get(baseNetworkId) as string)])
        NetworkFn.addNode(mergedNetwork, newNodeId);
    });
    networkRecords[baseNetworkId]?.network.edges.forEach(oriEdge => {
        const newEdgeeId: string = `e${globalEdgeId++}`;
        const [oriId, oriSource, oriTarget] = [oriEdge.id, oriEdge.s, oriEdge.t];
        if (edgeIdSet.has(oriId)) {
            throw new Error(`Duplicate edge id found in the network:${baseNetworkId}`);
        }
        edgeIdSet.add(oriId);
        const oriEntry = networkRecords[baseNetworkId].edgeTable.rows.get(oriId);
        if (oriEntry === undefined) {
            throw new Error("Edge not found in the edge table");
        }
        initialEdgeRows.push([newEdgeeId, castAttributes(oriEntry, getAttributeMapping(edgeAttributeMapping, baseNetworkId, false))]);
        const newSourceId = node2nodeMap.get(`${baseNetworkId}-${oriSource}`);
        const newTargetId = node2nodeMap.get(`${baseNetworkId}-${oriTarget}`);
        if (newSourceId === undefined || newTargetId === undefined) {
            throw new Error("Source or target Edge not found in the node map");
        }
        NetworkFn.addEdge(mergedNetwork, { id: newEdgeeId, s: newSourceId, t: newTargetId } as Edge);
        edgeMap.set(`${newSourceId}-${newTargetId}`, newEdgeeId);
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
            node2nodeMap.set(`${netToMerge}-${nodeId}`, newNodeId);
            NetworkFn.addNode(mergedNetwork, newNodeId);
            const nodeRecord = networkRecords[netToMerge].nodeTable.rows.get(nodeId);
            TableFn.insertRow(mergedNodeTable, [newNodeId,
                addMergedAtt(castAttributes(nodeRecord, getAttributeMapping(nodeAttributeMapping, netToMerge)), nodeRecord,
                    mergedAttName, reversedAttMap.get(netToMerge) as string)]);
        }

        //matched nodes
        for (const [mergedNodeId, newNodeId] of matchedNodeIds) {
            //mergedNodeId is the node already existing in the merged network
            //newNodeId is the node to be merged
            nodeIdMap.set(mergedNodeId, { ...nodeIdMap.get(mergedNodeId), netToMerge: newNodeId });
            node2nodeMap.set(`${netToMerge}-${newNodeId}`, mergedNodeId);
            const nodeRecord = networkRecords[netToMerge].nodeTable.rows.get(newNodeId);
            const mergedRow = mergedNodeTable.rows.get(mergedNodeId);
            if (mergedRow === undefined) {
                throw new Error("Node not found in the node table");
            }
            const castedRecord = castAttributes(nodeRecord, getAttributeMapping(nodeAttributeMapping, netToMerge));
            //update the row
            Object.entries(castedRecord).forEach((entry: [string, ValueType]) => {
                if (!mergedRow.hasOwnProperty(entry[0])) {
                    mergedRow[entry[0]] = entry[1];
                }
            });
            // update the mergedNodeTable
            TableFn.updateRow(mergedNodeTable, [mergedNodeId, mergedRow]);
        }
    }
    // merge edges
    for (const netToMerge of fromNetworks.slice(1)) {
        const edgeLst: Edge[] = networkRecords[netToMerge].network.edges;
        if (edgeLst.length !== new Set(edgeLst).size) {
            throw new Error(`Duplicate edges found in the network:${netToMerge}`);
        }
        for (const edgeObj of edgeLst) {
            const newEdgeId = `e${globalEdgeId++}`;
            const oriEdgeId = edgeObj.id;
            const edgeRecord = networkRecords[netToMerge].edgeTable.rows.get(oriEdgeId);
            if (edgeRecord === undefined) {
                throw new Error("Edge not found in the edge table");
            }
            const sourceId = node2nodeMap.get(`${netToMerge}-${edgeObj.s}`);
            const targetId = node2nodeMap.get(`${netToMerge}-${edgeObj.t}`);
            if (sourceId === undefined || targetId === undefined) {
                throw new Error("Edge source or target not found in the node map");
            }
            const castedRecord = castAttributes(edgeRecord, getAttributeMapping(edgeAttributeMapping, netToMerge, false));
            const mergedEdgeId = edgeMap.get(`${sourceId}-${targetId}`);
            if (mergedEdgeId !== undefined) { // there is already an edge between the source and target node
                const mergedRow = mergedEdgeTable.rows.get(mergedEdgeId);
                if (mergedRow === undefined) {
                    throw new Error("Edge not found in the merged edge table");
                }
                if (mergedRow.hasOwnProperty('interaction') && castedRecord.hasOwnProperty('interaction')) {
                    if (mergedRow['interaction'] === castedRecord['interaction']) {
                        //update the row
                        Object.entries(castedRecord).forEach((entry: [string, ValueType]) => {
                            if (!mergedRow.hasOwnProperty(entry[0])) {
                                mergedRow[entry[0]] = entry[1];
                            }
                        });
                        // update the mergedEdgeTable
                        TableFn.updateRow(mergedEdgeTable, [mergedEdgeId, mergedRow]);
                    }
                }
                // Todo: how to deal with the attribute conflicts?
            } else { // insert a new edge
                TableFn.insertRow(mergedEdgeTable, [newEdgeId, castedRecord]);
                NetworkFn.addEdge(mergedNetwork, { id: newEdgeId, s: sourceId, t: targetId } as Edge);
                edgeMap.set(`${sourceId}-${targetId}`, newEdgeId);
            }
        }
    }
    // Todo: merge nodes/edges in the same network
    // Todo: merge only nodes and ignore edges
    return {
        network: mergedNetwork,
        nodeTable: mergedNodeTable,
        edgeTable: mergedEdgeTable

    }
}