import { IdType } from "../../../../models/IdType";
import TableFn from "../../../../models/TableModel";
import { NetworkRecord, Pair } from "../DataInterfaceForMerge";
import NetworkFn, { Edge, Network, Node } from "../../../../models/NetworkModel";
import { Column } from "../../../../models/TableModel/Column";
import { ListOfValueType, SingleValueType, ValueType } from "../../../../models/TableModel/ValueType";
import { MatchingTable } from "../MatchingTable";
import { getMergedAttributes, getReversedMergedAttMap } from "./MatchingTableImpl";
import { removePair } from "../../utils/helper-functions";
import { preprocess, castAttributes, addMergedAtt, getKeybyAttribute, mergeAttributes, duplicateAttName } from "../../utils/attributes-operations";

export function differenceMerge(fromNetworks: IdType[], toNetworkId: IdType, networkRecords: Record<IdType, NetworkRecord>,
    nodeAttributeMapping: MatchingTable, edgeAttributeMapping: MatchingTable, matchingAttribute: Record<IdType, Column>,
    mergeWithinNetwork: boolean = false, mergeOnlyNodes: boolean = false, strictRemoveMode: boolean = false): NetworkRecord {
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
    const matchingAttributeMap = new Map<SingleValueType, IdType>();
    // record the node to edges mapping
    const sourceNode2EdgeMap = new Map<SingleValueType, Pair<string, IdType>[]>();
    const targetNode2EdgeMap = new Map<SingleValueType, Pair<string, IdType>[]>();
    const edgeToRemove: Set<IdType> = new Set();

    for (const netId of fromNetworks) {
        const nodeLst = networkRecords[netId].network.nodes
        if (nodeLst.length !== new Set(nodeLst).size) {
            throw new Error(`Duplicate nodes found in the network:${netId}`);
        }
    }

    const nodeToSubtract: Set<SingleValueType> = new Set()
    const baseMatchingColName: string = matchingAttribute[baseNetId].name
    const secMatchingColName: string = matchingAttribute[secondNetId].name    

    const matchedNodes: Set<IdType> = new Set()
    const unmatchedNodes: Set<IdType> = new Set()

    function getIdentifiableFromEdge(edgeObj: Edge, netId: IdType, colName: string): [SingleValueType, SingleValueType, string] {
        const edgeEntry = networkRecords[netId].edgeTable.rows.get(edgeObj.id)
        const sourceEntry = networkRecords[netId].nodeTable.rows.get(edgeObj.s)
        const targetEntry = networkRecords[netId].nodeTable.rows.get(edgeObj.t)
        if (edgeEntry === undefined) throw new Error("Edge not found in the edge table")
        if (sourceEntry === undefined || targetEntry === undefined) throw new Error("Node not found in the node table")
        const sourceNodeKey = getKeybyAttribute(sourceEntry[colName])
        const targetNodeKey = getKeybyAttribute(targetEntry[colName])
        const edgeInteraction = String(edgeEntry['interaction']) ?? 'None'
        return [sourceNodeKey, targetNodeKey, edgeInteraction]
    }

    networkRecords[secondNetId].network.nodes.forEach(nodeObj => {
        const nodeEntry = networkRecords[secondNetId].nodeTable.rows.get(nodeObj.id)
        if (nodeEntry === undefined) throw new Error("Node not found in the node table")
        nodeToSubtract.add(getKeybyAttribute(nodeEntry[secMatchingColName]))
    })

    networkRecords[baseNetId].network.nodes.forEach(nodeObj => {
        const newNodeId: string = `${globalNodeId++}`;
        node2nodeMap.set(`${baseNetId}-${nodeObj.id}`, newNodeId);
        const nodeEntry = networkRecords[baseNetId].nodeTable.rows.get(nodeObj.id)
        if (nodeEntry === undefined) throw new Error("Node not found in the node table")
        const attributeMapKey = getKeybyAttribute(nodeEntry[baseMatchingColName]);

        if (mergeWithinNetwork && matchingAttributeMap.has(attributeMapKey)) {
            const matchedNodeId = matchingAttributeMap.get(attributeMapKey);
            if (matchedNodeId !== undefined) {
                initialNodeRows[matchedNodeId] = mergeAttributes( //merge within the network
                    initialNodeRows[matchedNodeId], castAttributes(nodeEntry, baseNetId, nodeAttributeMapping)
                )
                node2nodeMap.set(`${baseNetId}-${nodeObj.id}`, matchedNodeId);//reset the node2nodeMap
            }
        }else{
            if (attributeMapKey !== undefined && attributeMapKey !== '') {
                matchingAttributeMap.set(attributeMapKey, newNodeId);
            }
            initialNodeRows[newNodeId] = addMergedAtt(castAttributes(nodeEntry, baseNetId, nodeAttributeMapping),
            nodeEntry[reversedAttMap.get(baseNetId) as string], mergedAttCol)
            if(nodeToSubtract.has(attributeMapKey)) matchedNodes.add(newNodeId)
            else unmatchedNodes.add(newNodeId)
        }    
    })

    if (strictRemoveMode) { // subtract the node as long as it exists in the second network
        for(const nodeId of unmatchedNodes){
            NetworkFn.addNode(mergedNetwork, nodeId);
        }
        for(const nodeId of matchedNodes){
            delete initialNodeRows[nodeId]
        }
    } else {// Only remove nodes if all their edges are being subtracted, too
        networkRecords[baseNetId].network.edges.forEach(edgeObj => {
            const [sourceNodeKey, targetNodeKey, edgeInteraction] = getIdentifiableFromEdge(edgeObj, baseNetId, baseMatchingColName)
            if (sourceNode2EdgeMap.has(sourceNodeKey)) {
                sourceNode2EdgeMap.get(sourceNodeKey)?.push([`${targetNodeKey}-${edgeInteraction}`, edgeObj.id] as Pair<string, IdType>)
            } else {
                sourceNode2EdgeMap.set(sourceNodeKey, [[`${targetNodeKey}-${edgeInteraction}`, edgeObj.id] as Pair<string, IdType>])
            }
            if (targetNode2EdgeMap.has(targetNodeKey)) {
                targetNode2EdgeMap.get(targetNodeKey)?.push([`${sourceNodeKey}-${edgeInteraction}`, edgeObj.id] as Pair<string, IdType>)
            } else {
                targetNode2EdgeMap.set(targetNodeKey, [[`${sourceNodeKey}-${edgeInteraction}`, edgeObj.id] as Pair<string, IdType>])
            }
        })
        networkRecords[secondNetId].network.edges.forEach(edgeObj => {
            const [sourceNodeKey, targetNodeKey, edgeInteraction] = getIdentifiableFromEdge(edgeObj, secondNetId, secMatchingColName)
            if (sourceNode2EdgeMap.has(sourceNodeKey)) {// remove the edge interaction from the list
                removePair(sourceNode2EdgeMap.get(sourceNodeKey) as Pair<string, IdType>[], `${targetNodeKey}-${edgeInteraction}`)
                edgeToRemove.add(`${sourceNodeKey}-${targetNodeKey}-${edgeInteraction}`)
            }
            if (targetNode2EdgeMap.has(targetNodeKey)) {
                removePair(targetNode2EdgeMap.get(targetNodeKey) as Pair<string, IdType>[], `${sourceNodeKey}-${edgeInteraction}`)
                edgeToRemove.add(`${sourceNodeKey}-${targetNodeKey}-${edgeInteraction}`)
            }
        })
        for(const nodeId of unmatchedNodes){
            NetworkFn.addNode(mergedNetwork, nodeId);
        }
        for(const nodeId of matchedNodes){
            const nodeKey = getKeybyAttribute(initialNodeRows[nodeId][baseMatchingColName])
            if((sourceNode2EdgeMap.get(nodeKey)?.length ?? 0) > 0 || (targetNode2EdgeMap.get(nodeKey)?.length ?? 0) > 0){
                NetworkFn.addNode(mergedNetwork, nodeId);
                unmatchedNodes.add(nodeId)
            }else{
                delete initialNodeRows[nodeId]
            }
        }
    }
    networkRecords[baseNetId].network.edges.forEach(edgeObj => {
        const [sourceNodeKey, targetNodeKey, edgeInteraction] = getIdentifiableFromEdge(edgeObj, baseNetId, baseMatchingColName)
        const edgeEntry = networkRecords[baseNetId].edgeTable.rows.get(edgeObj.id)
        if (edgeEntry === undefined) throw new Error("Edge not found in the edge table")
        const sourceNodeId = node2nodeMap.get(`${baseNetId}-${edgeObj.s}`)
        const targetNodeId =  node2nodeMap.get(`${baseNetId}-${edgeObj.t}`)
        if (sourceNodeId && targetNodeId && unmatchedNodes.has(sourceNodeId) && unmatchedNodes.has(targetNodeId) 
            && (strictRemoveMode||!edgeToRemove.has(`${sourceNodeKey}-${targetNodeKey}-${edgeInteraction}`))) {
            const newEdgeId = `e${globalEdgeId++}`
            initialEdgeRows[newEdgeId] = castAttributes(edgeEntry, baseNetId, edgeAttributeMapping, false)
            NetworkFn.addEdge(mergedNetwork, { id: newEdgeId, s: sourceNodeId, t: targetNodeId } as Edge);
        }
    })
    TableFn.insertRows(mergedNodeTable, Object.entries(initialNodeRows));
    TableFn.insertRows(mergedEdgeTable, Object.entries(initialEdgeRows));
    return {
        network: mergedNetwork,
        nodeTable: mergedNodeTable,
        edgeTable: mergedEdgeTable

    }
}