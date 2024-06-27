import { IdType } from "../../../../models/IdType";
import TableFn from "../../../../models/TableModel";
import { NetworkRecord, Pair } from "../DataInterfaceForMerge";
import NetworkFn, { Edge, Network, Node } from "../../../../models/NetworkModel";
import { Column } from "../../../../models/TableModel/Column";
import { ListOfValueType, SingleValueType, ValueType } from "../../../../models/TableModel/ValueType";
import { MatchingTable } from "../MatchingTable";
import { getMergedAttributes, getReversedMergedAttMap } from "./MatchingTableImpl";
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

    for (const netId of fromNetworks) {
        const nodeLst = networkRecords[netId].network.nodes
        if (nodeLst.length !== new Set(nodeLst).size) {
            throw new Error(`Duplicate nodes found in the network:${netId}`);
        }
    }

    const nodeToSubtract: Set<SingleValueType> = new Set()
    const baseMatchingColName: string = matchingAttribute[baseNetId].name
    const secMatchingColName: string = matchingAttribute[secondNetId].name    

    networkRecords[secondNetId].network.nodes.forEach(nodeObj => {
        const nodeEntry = networkRecords[secondNetId].nodeTable.rows.get(nodeObj.id)
        if (nodeEntry === undefined) throw new Error("Node not found in the node table")
        nodeToSubtract.add(getKeybyAttribute(nodeEntry[secMatchingColName]))
    })

    if (strictRemoveMode) { // subtract the node as long as it exists in the second network    

        const remainingNodeIds: Set<IdType> = new Set(node2nodeMap.keys())
        networkRecords[baseNetId].network.nodes.forEach(nodeObj => {
            const newNodeId: string = `${globalNodeId++}`;
            node2nodeMap.set(`${baseNetId}-${nodeObj.id}`, newNodeId);
            const nodeEntry = networkRecords[baseNetId].nodeTable.rows.get(nodeObj.id)
            if (nodeEntry === undefined) throw new Error("Node not found in the node table")
            const attributeMapKey = getKeybyAttribute(nodeEntry[matchingAttribute[baseNetId].name]);
    
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
            }    
        })
        networkRecords[baseNetId].network.edges.forEach(edgeObj => {
            const edgeEntry = networkRecords[baseNetId].edgeTable.rows.get(edgeObj.id)
            if (edgeEntry === undefined) throw new Error("Edge not found in the edge table")
            if (remainingNodeIds.has(edgeObj.s) && remainingNodeIds.has(edgeObj.t)) {
                const newEdgeId = `e${globalEdgeId++}`
                initialEdgeRows[newEdgeId] = castAttributes(edgeEntry, baseNetId, edgeAttributeMapping, false)
                NetworkFn.addEdge(mergedNetwork, { id: newEdgeId, s: node2nodeMap.get(edgeObj.s), t: node2nodeMap.get(edgeObj.t) } as Edge);
            }
        })

    } else {// Only remove nodes if all their edges are being subtracted, too
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

        networkRecords[baseNetId].network.edges.forEach(edgeObj => {
            const [sourceNodeKey, targetNodeKey, edgeInteraction] = getIdentifiableFromEdge(edgeObj, baseNetId, baseMatchingColName)
            if (sourceNode2EdgeMap.has(sourceNodeKey)) {
                sourceNode2EdgeMap.get(sourceNodeKey)?.push([edgeInteraction, edgeObj.id] as Pair<string, IdType>)
            } else {
                sourceNode2EdgeMap.set(sourceNodeKey, [[edgeInteraction, edgeObj.id] as Pair<string, IdType>])
            }
            if (targetNode2EdgeMap.has(targetNodeKey)) {
                targetNode2EdgeMap.get(targetNodeKey)?.push([edgeInteraction, edgeObj.id] as Pair<string, IdType>)
            } else {
                targetNode2EdgeMap.set(targetNodeKey, [[edgeInteraction, edgeObj.id] as Pair<string, IdType>])
            }
        })
        networkRecords[secondNetId].network.edges.forEach(edgeObj => {
            const [sourceNodeKey, targetNodeKey, edgeInteraction] = getIdentifiableFromEdge(edgeObj, secondNetId, secMatchingColName)
            if (sourceNode2EdgeMap.has(sourceNodeKey)) {// remove the edge interaction from the list
                removePair(sourceNode2EdgeMap.get(sourceNodeKey) as Pair<string, IdType>[], edgeInteraction)
            }
            if (targetNode2EdgeMap.has(targetNodeKey)) {
                removePair(targetNode2EdgeMap.get(targetNodeKey) as Pair<string, IdType>[], edgeInteraction)
            }
        })
        networkRecords[baseNetId].network.nodes.forEach(nodeObj => {
            const nodeEntry = networkRecords[baseNetId].nodeTable.rows.get(nodeObj.id)
            if (nodeEntry === undefined) throw new Error("Node not found in the node table")
            const nodeKey = getKeybyAttribute(nodeEntry[baseMatchingColName])
            if ((!nodeToSubtract.has(nodeKey)) || (sourceNode2EdgeMap.get(nodeKey)?.length ?? 0) > 0 || (targetNode2EdgeMap.get(nodeKey)?.length ?? 0) > 0) {
                const newNodeId = `${globalNodeId++}`
                initialNodeRows[newNodeId] = addMergedAtt(castAttributes(nodeEntry, baseNetId, nodeAttributeMapping),
                    nodeEntry[reversedAttMap.get(baseNetId) as string], mergedAttCol)
                NetworkFn.addNode(mergedNetwork, newNodeId);
                node2nodeMap.set(nodeObj.id, newNodeId)
            }
        })
        const remainingNodeIds: Set<IdType> = new Set(node2nodeMap.keys())
        networkRecords[baseNetId].network.edges.forEach(edgeObj => {
            const edgeEntry = networkRecords[baseNetId].edgeTable.rows.get(edgeObj.id)
            if (edgeEntry === undefined) throw new Error("Edge not found in the edge table")
            if (remainingNodeIds.has(edgeObj.s) && remainingNodeIds.has(edgeObj.t)) {
                const newEdgeId = `e${globalEdgeId++}`
                initialEdgeRows[newEdgeId] = castAttributes(edgeEntry, baseNetId, edgeAttributeMapping, false)
                NetworkFn.addEdge(mergedNetwork, { id: newEdgeId, s: node2nodeMap.get(edgeObj.s), t: node2nodeMap.get(edgeObj.t) } as Edge);
            }
        })
    }
    TableFn.insertRows(mergedNodeTable, Object.entries(initialNodeRows));
    TableFn.insertRows(mergedEdgeTable, Object.entries(initialEdgeRows));
    return {
        network: mergedNetwork,
        nodeTable: mergedNodeTable,
        edgeTable: mergedEdgeTable

    }
}

// Function to find and remove the pair
const removePair = (list: Pair<string, string>[], target: string): Pair<string, string> | undefined => {
    const index = list.findIndex((pair) => pair[0] === target);
    if (index !== -1) {
        return list.splice(index, 1)[0];  // Remove the item and return it
    }
    return undefined;  // Return undefined if no item was found
};