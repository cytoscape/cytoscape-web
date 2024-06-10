import { IdType } from "../../../../models/IdType";
import TableFn from "../../../../models/TableModel";
import { NetworkRecord } from "../DataInterfaceForMerge";
import NetworkFn, { Edge, Network, Node } from "../../../../models/NetworkModel";
import { Column } from "../../../../models/TableModel/Column";
import { ListOfValueType, SingleValueType, ValueType } from "../../../../models/TableModel/ValueType";
import { attributeValueMatcher } from "../../utils/attributes-operations";
import { MatchingTable } from "../MatchingTable";
import { getMergedAttributes, getReversedMergedAttMap } from "./MatchingTableImpl";
import { preprocess, castAttributes, addMergedAtt, getKeybyAttribute } from "../../utils/attributes-operations";

export function mergeNetwork(fromNetworks: IdType[], toNetworkId: IdType, networkRecords: Record<IdType, NetworkRecord>,
    nodeAttributeMapping: MatchingTable, edgeAttributeMapping: MatchingTable, matchingAttribute: Record<IdType, Column>,
    mergeWithinNetwork: boolean = false): NetworkRecord {
    const nodeMergedAttributes = getMergedAttributes(nodeAttributeMapping)
    const edgeMergedAttributes = getMergedAttributes(edgeAttributeMapping)
    if (duplicateAttName(nodeMergedAttributes) || duplicateAttName(edgeMergedAttributes)) {
        throw new Error("Duplicate merged attribute names found")
    }
    const reversedAttMap = getReversedMergedAttMap(nodeAttributeMapping)
    const mergedAttCol: Column = { name: nodeMergedAttributes[0].name, type: nodeMergedAttributes[0].type }
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
    const initialNodeRows: Record<string, Record<string, ValueType>> = {}
    const initialEdgeRows: Record<string, Record<string, ValueType>> = {}
    // map the node id in the fromNetworks to the mergedNetwork 
    const node2nodeMap = new Map<string, IdType>();
    const nodeIdSet = new Set<IdType>(); // prevent duplicate nodes
    const edgeIdSet = new Set<IdType>(); // prevent duplicate edges
    const matchingAttributeMap = new Map<SingleValueType, IdType>();
    // record the edge
    const edgeMap = new Map<string, IdType[]>();

    networkRecords[baseNetworkId]?.nodeTable.rows.forEach((entry, oriId) => {
        const newNodeId: string = `${globalNodeId++}`;
        node2nodeMap.set(`${baseNetworkId}-${oriId}`, newNodeId);
        if (nodeIdSet.has(oriId)) {
            throw new Error(`Duplicate node id found in the network:${baseNetworkId}`);
        }
        nodeIdSet.add(oriId);
        if (entry === undefined) {
            throw new Error("Node not found in the node table");
        }
        const attributeMapKey = getKeybyAttribute(entry[matchingAttribute[baseNetworkId].name]);

        if (mergeWithinNetwork && matchingAttributeMap.has(attributeMapKey)) {
            const matchedNodeId = matchingAttributeMap.get(attributeMapKey);
            if (matchedNodeId !== undefined) {
                initialNodeRows[matchedNodeId] = mergeAttributes( //merge within the network
                    initialNodeRows[matchedNodeId], castAttributes(entry, baseNetworkId, nodeAttributeMapping)
                )
                node2nodeMap.set(`${baseNetworkId}-${oriId}`, matchedNodeId);//reset the node2nodeMap
            }

        } else {
            if (attributeMapKey !== undefined && attributeMapKey !== '') {
                matchingAttributeMap.set(attributeMapKey, newNodeId);
            }
            initialNodeRows[newNodeId] = addMergedAtt(castAttributes(entry, baseNetworkId, nodeAttributeMapping),
                entry[reversedAttMap.get(baseNetworkId) as string], mergedAttCol)
        }
    });
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
        const mergedEdgeIds = edgeMap.get(`${newSourceId}-${newTargetId}`);

        let shouldAddEdge = true;
        if (mergeWithinNetwork && mergedEdgeIds) {
            let hasMatched = mergedEdgeIds.some(mergedEdgeId => {
                const originalRow = initialEdgeRows[mergedEdgeId];
                if (originalRow === undefined) {
                    throw new Error("Edge not found in the merged edge table");
                }
                const isMatch = (originalRow.interaction === oriEntry.interaction) ||
                    (!originalRow.hasOwnProperty('interaction') && !oriEntry.hasOwnProperty('interaction'));

                if (isMatch) {
                    initialEdgeRows[mergedEdgeId] = mergeAttributes(originalRow, castAttributes(oriEntry, baseNetworkId, edgeAttributeMapping, false));
                    return true; // Match found, break the loop
                }
                return false;
            });

            shouldAddEdge = !hasMatched;
        }

        if (shouldAddEdge) {
            initialEdgeRows[newEdgeId] = castAttributes(oriEntry, baseNetworkId, edgeAttributeMapping, false);
            if (mergedEdgeIds) {
                mergedEdgeIds.push(newEdgeId);
            } else {
                edgeMap.set(`${newSourceId}-${newTargetId}`, [newEdgeId]);
            }
        }
    });

    const mergedNodeRows: Record<string, Record<string, ValueType>> = {}
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
        const unmatchedNodeIds = new Set<IdType>();
        // loop over the nodes of the network to merge
        for (const nodeObj of nodeLst) {
            const nodeId = nodeObj.id;
            const nodeRecord = networkRecords[netToMerge].nodeTable.rows.get(nodeId);
            if (nodeRecord === undefined) {
                throw new Error("Node not found in the node table");
            }
            const matchedNodeId = attributeValueMatcher(nodeRecord[matchingAttribute[netToMerge].name], matchingAttributeMap);
            if (matchedNodeId) {
                matchedNodeIds.push([matchedNodeId, nodeId]);
            } else {
                unmatchedNodeIds.add(nodeId);
            }
        }
        for (const [key, value] of matchingAttributeMap) {
            if (unmatchedNodeIds.has(value)) {
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
            // update the mergedNodeTable
            mergedNodeRows[mergedNodeId] = mergeAttributes(originalRow, castedRecord);

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
            const castedRecord = castAttributes(edgeRecord, netToMerge, edgeAttributeMapping, false);
            const mergedEdgeIds = edgeMap.get(`${sourceId}-${targetId}`);
            if (mergedEdgeIds !== undefined) { // there is already an edge between the source and target node
                let hasMatched = false;
                for (const mergedEdgeId of mergedEdgeIds) {
                    const originalRow = mergedEdgeTable.rows.get(mergedEdgeId);
                    if (originalRow === undefined) {
                        throw new Error("Edge not found in the merged edge table");
                    }
                    if ((originalRow.hasOwnProperty('interaction') && castedRecord.hasOwnProperty('interaction') && originalRow['interaction'] === castedRecord['interaction']) ||
                        (!originalRow.hasOwnProperty('interaction') && !castedRecord.hasOwnProperty('interaction'))) {
                        // update the mergedEdgeTable
                        TableFn.updateRow(mergedEdgeTable, [mergedEdgeId, mergeAttributes(originalRow, castedRecord)]);
                        hasMatched = true;
                        break;
                    }
                };
                if (!hasMatched) { // insert a new edge
                    TableFn.insertRow(mergedEdgeTable, [newEdgeId, castedRecord]);
                    NetworkFn.addEdge(mergedNetwork, { id: newEdgeId, s: sourceId, t: targetId } as Edge);
                    edgeMap.get(`${sourceId}-${targetId}`)?.push(newEdgeId);
                }
            } else { // insert a new edge
                TableFn.insertRow(mergedEdgeTable, [newEdgeId, castedRecord]);
                NetworkFn.addEdge(mergedNetwork, { id: newEdgeId, s: sourceId, t: targetId } as Edge);
                edgeMap.set(`${sourceId}-${targetId}`, [newEdgeId]);
            }
        }
    }
    return {
        network: mergedNetwork,
        nodeTable: mergedNodeTable,
        edgeTable: mergedEdgeTable

    }
}

function mergeAttributes(orinalRow: Record<string, ValueType>, castedRecord: Record<string, ValueType>): Record<string, ValueType> {
    const mergedRow = { ...orinalRow }
    Object.entries(castedRecord).forEach(([key, value]) => {
        if (!mergedRow.hasOwnProperty(key)) {
            mergedRow[key] = value;
        } else if (Array.isArray(mergedRow[key]) && Array.isArray(value)) {
            if ((mergedRow[key] as ListOfValueType).every(item => typeof item === typeof value[0])) {
                mergedRow[key] = [...new Set([...(mergedRow[key] as ListOfValueType), ...value])] as ValueType;
            } else {
                throw new Error(`Type mismatch for key ${key}: ${typeof (mergedRow[key] as ListOfValueType)[0]} vs ${typeof value[0]}`);
            }
        }
    });
    //Todo: whether to concat string, the behavior is not clear
    return mergedRow;
}

function duplicateAttName(mergedAttributes: Column[]): boolean {
    return (new Set(mergedAttributes.map(col => col.name))).size < mergedAttributes.length
}