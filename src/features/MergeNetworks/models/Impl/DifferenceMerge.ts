import { IdType } from "../../../../models/IdType";
import TableFn from "../../../../models/TableModel";
import { NetworkRecord } from "../DataInterfaceForMerge";
import NetworkFn, { Edge, Network, Node } from "../../../../models/NetworkModel";
import { Column } from "../../../../models/TableModel/Column";
import { ListOfValueType, SingleValueType, ValueType } from "../../../../models/TableModel/ValueType";
import { attributeValueMatcher } from "../../utils/attributes-operations";
import { MatchingTable } from "../MatchingTable";
import { getMergedAttributes, getReversedMergedAttMap } from "./MatchingTableImpl";
import { preprocess, castAttributes, addMergedAtt, getKeybyAttribute, mergeAttributes, duplicateAttName } from "../../utils/attributes-operations";

export function differenceMerge(fromNetworks: IdType[], toNetworkId: IdType, networkRecords: Record<IdType, NetworkRecord>,
    nodeAttributeMapping: MatchingTable, edgeAttributeMapping: MatchingTable, matchingAttribute: Record<IdType, Column>,
    mergeWithinNetwork: boolean = false, mergeOnlyNodes: boolean = false, strictRemove: boolean = false): NetworkRecord {
    if (fromNetworks.length !== 2) {
        throw new Error('Difference merge can only be operated between two networks.')
    }
    const nodeMergedAttributes = getMergedAttributes(nodeAttributeMapping)
    const edgeMergedAttributes = getMergedAttributes(edgeAttributeMapping)
    if (duplicateAttName(nodeMergedAttributes) || duplicateAttName(edgeMergedAttributes)) {
        throw new Error("Duplicate merged attribute names found")
    }
    const reversedAttMap = getReversedMergedAttMap(nodeAttributeMapping)
    const mergedAttCol: Column = { name: nodeMergedAttributes[0].name, type: nodeMergedAttributes[0].type }
    // preprocess the network to merge    
    const { mergedNodeTable, mergedEdgeTable } = preprocess(toNetworkId, nodeMergedAttributes, edgeMergedAttributes);
    const baseNetId = fromNetworks[0]
    const secondNetId = fromNetworks[1]
    const mergedNetwork: Network = NetworkFn.createNetwork(toNetworkId)
    // reset all the node and edge ids, starting from 0
    let globalNodeId = 0;
    let globalEdgeId = 0;
    //initialize the node and edge rows
    const initialNodeRows: Record<string, Record<string, ValueType>> = {}
    const initialEdgeRows: Record<string, Record<string, ValueType>> = {}
    // map the node id in the fromNetworks to the mergedNetwork 
    const node2nodeMap = new Map<string, IdType>();
    const nodeIdSet = new Set<IdType>(); // prevent duplicate nodes
    const edgeIdSet = new Set<IdType>(); // prevent duplicate edges
    const matchingAttributeMap = new Map<SingleValueType, IdType>();
    // record the edge
    const edgeMap = new Map<string, IdType[]>();

    for (const netId of fromNetworks) {
        const nodeLst = networkRecords[netId].network.nodes
        if (nodeLst.length !== new Set(nodeLst).size) {
            throw new Error(`Duplicate nodes found in the network:${netId}`);
        }
    }
    if (strictRemove) { // subtract the node as long as it exists in the second network
        const nodeToSubtract: Set<SingleValueType> = new Set()
        const baseMatchingColName: string = matchingAttribute[baseNetId].name
        const secMatchingColName: string = matchingAttribute[secondNetId].name
        networkRecords[secondNetId].network.nodes.forEach(nodeObj => {
            const nodeEntry = networkRecords[secondNetId].nodeTable.rows.get(nodeObj.id)
            if (nodeEntry === undefined) throw new Error("Node not found in the node table")
            nodeToSubtract.add(getKeybyAttribute(nodeEntry[secMatchingColName]))
        })
        networkRecords[baseNetId].network.nodes.forEach(nodeObj => {
            const nodeEntry = networkRecords[baseNetId].nodeTable.rows.get(nodeObj.id)
            if (nodeEntry === undefined) throw new Error("Node not found in the node table")
            if (!nodeToSubtract.has(getKeybyAttribute(nodeEntry[baseMatchingColName]))) {

            }
        })

    }

    let differentNodeIds = new Set(node2nodeMap.values());
    // subtract nodes
    const matchedNodeIds: [IdType, IdType][] = [];
    networkRecords[fromNetworks[1]].network.nodes.forEach(nodeObj => {

        const nodeId = nodeObj.id;
        const nodeRecord = networkRecords[netToMerge].nodeTable.rows.get(nodeId);
        if (nodeRecord === undefined) {
            throw new Error("Node not found in the node table");
        }
        const matchedNodeId = attributeValueMatcher(nodeRecord[matchingAttribute[netToMerge].name], matchingAttributeMap);
        if (matchedNodeId) {
            matchedNodeIds.push([matchedNodeId, nodeId]);
        }

        intersectedNodeIds = new Set([...intersectedNodeIds].filter(x => matchedNodeIds.map(([newNodeId, _]) => newNodeId).includes(x)));
        for (const [key, value] of matchingAttributeMap) {
            if (!intersectedNodeIds.has(value)) {
                matchingAttributeMap.delete(key);
            }
        }
        //matched nodes
        for (const [mergedNodeId, newNodeId] of matchedNodeIds) {
            //mergedNodeId is the node already existing in the merged network
            //newNodeId is the node to be merged
            node2nodeMap.set(`${netToMerge}-${newNodeId}`, mergedNodeId);
            const nodeRecord = networkRecords[netToMerge].nodeTable.rows.get(newNodeId);
            const originalRow = initialNodeRows[mergedNodeId];
            if (originalRow === undefined) throw new Error("Node not found in the node table");
            const castedRecord = castAttributes(nodeRecord, netToMerge, nodeAttributeMapping);
            initialNodeRows[mergedNodeId] = mergeAttributes(originalRow, castedRecord);
        }
    })

    //Add intersection nodes to nodeTable and network
    TableFn.insertRows(mergedNodeTable, Object.entries(initialNodeRows).filter(([id]) => intersectedNodeIds.has(id)));
    for (const nodeId of intersectedNodeIds) {
        NetworkFn.addNode(mergedNetwork, nodeId)
    }

    networkRecords[baseNetworkId]?.network.edges.forEach(oriEdge => {
        const newEdgeId: string = `e${globalEdgeId++}`;
        const [oriId, oriSource, oriTarget] = [oriEdge.id, oriEdge.s, oriEdge.t];
        if (edgeIdSet.has(oriId)) {
            throw new Error(`Duplicate edge id found in the network:${baseNetworkId}`);
        }
        edgeIdSet.add(oriId);
        const oriEntry = networkRecords[baseNetworkId].edgeTable.rows.get(oriId);
        if (oriEntry === undefined) {
            throw new Error("Edge not found in the edge table");
        }
        const newSourceId = node2nodeMap.get(`${baseNetworkId}-${oriSource}`);
        const newTargetId = node2nodeMap.get(`${baseNetworkId}-${oriTarget}`);
        if (newSourceId === undefined || newTargetId === undefined) {
            throw new Error("Source or target Edge not found in the node map");
        }
        if (intersectedNodeIds.has(newSourceId) && intersectedNodeIds.has(newTargetId)) {
            const edgeInteraction = oriEntry['interaction'] ?? ''
            const mergedEdgeIds = edgeMap.get(`${newSourceId}-${newTargetId}-${edgeInteraction}`);
            if (mergeWithinNetwork && mergedEdgeIds) {
                const originalRow = initialEdgeRows[mergedEdgeIds[0]];
                initialEdgeRows[mergedEdgeIds[0]] = mergeAttributes(originalRow, castAttributes(oriEntry, baseNetworkId, edgeAttributeMapping, false));
            } else {
                initialEdgeRows[newEdgeId] = castAttributes(oriEntry, baseNetworkId, edgeAttributeMapping, false);
                if (mergedEdgeIds) {
                    mergedEdgeIds.push(newEdgeId);
                } else {
                    edgeMap.set(`${newSourceId}-${newTargetId}-${edgeInteraction}`, [newEdgeId]);
                }
            }
        }
    });

    // merge edges
    for (const netToMerge of fromNetworks.slice(1)) {
        const edgeLst: Edge[] = networkRecords[netToMerge].network.edges;
        if (edgeLst.length !== new Set(edgeLst).size) {
            throw new Error(`Duplicate edges found in the network:${netToMerge}`);
        }
        const intersectionEdgeIds: Set<string> = new Set();
        for (const edgeObj of edgeLst) {
            const oriEdgeId = edgeObj.id;
            const edgeRecord = networkRecords[netToMerge].edgeTable.rows.get(oriEdgeId);
            if (edgeRecord === undefined) {
                throw new Error("Edge not found in the edge table");
            }
            const sourceId = node2nodeMap.get(`${netToMerge}-${edgeObj.s}`);
            const targetId = node2nodeMap.get(`${netToMerge}-${edgeObj.t}`);
            const edgeInteraction = edgeRecord['interaction'] ?? ''
            const edgeKey = `${sourceId}-${targetId}-${edgeInteraction}`
            const mergedEdgeIds = edgeMap.get(edgeKey);
            if (mergedEdgeIds) {
                intersectionEdgeIds.add(edgeKey)
                const originalRow = initialEdgeRows[mergedEdgeIds[0]];
                initialEdgeRows[mergedEdgeIds[0]] = mergeAttributes(originalRow, castAttributes(edgeRecord, netToMerge, edgeAttributeMapping, false));
            }

        }
        for (const edgeKey of edgeMap.keys()) {
            if (!intersectionEdgeIds.has(edgeKey)) {
                edgeMap.delete(edgeKey)
            }
        }
    }
    //Add intersection edges to nodeTable and network
    for (const [edgeKey, edgeIds] of edgeMap) {
        edgeIds.forEach(edgeId => {
            TableFn.insertRow(mergedEdgeTable, [edgeId, initialEdgeRows[edgeId]]);
            NetworkFn.addEdge(mergedNetwork, { id: edgeId, s: edgeKey.split('-')[0], t: edgeKey.split('-')[1] } as Edge);
        })
    }

    return {
        network: mergedNetwork,
        nodeTable: mergedNodeTable,
        edgeTable: mergedEdgeTable

    }
}