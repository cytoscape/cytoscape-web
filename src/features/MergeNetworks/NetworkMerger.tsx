import { UnionMerge } from "./UnionMerge";
import { NetworktoMerge } from "./model/DataInterfaceForMerge";
import { NetworkRecord } from "./components/MergeDialog";
import { IdType } from '../../models/IdType';
import { Pair } from '../../models/MergeModel/utils/Pair';
import { MatchingAttribute } from "./model/Impl/MatchingAttribute";
import { Node } from "../../models/NetworkModel";
import { AttributeMapping } from "./model/Impl/AttributeMapping";
import { AttributeValueMatcher } from "./utils/AttributeValueMatcher";
import { AttributeMerger } from "./utils/AttributeMerger";
import TableFn, { Table } from "../../models/TableModel";
import { map } from "lodash";

// Type of merge operation
export enum MergeOperation {
    Union = "Union",
    Intersection = "Intersection",
    Difference = "Difference"
}

export class NetworkMerger {
    networkRecords: Record<IdType, NetworkRecord>;
    matchingAttribute: MatchingAttribute;
    nodeAttributeMapping: AttributeMapping;
    edgeAttributeMapping: AttributeMapping;
    networkAttributeMapping: AttributeMapping;
    withinNetworkMerge: boolean;
    attributeValueMatcher: AttributeValueMatcher;
    attributeMerger: AttributeMerger;
    mergedNetwork: NetworkRecord;
    protected mapNodesIndex: Map<IdType, number>;
    protected mapEdgeInteractions: Map<IdType, Map<IdType, number>>;
    protected mapEdgeNoInteractions: Map<IdType, number>;


    constructor(networkRecords: Record<IdType, NetworkRecord>, matchingAttribute: MatchingAttribute,
        nodeAttributeMapping: AttributeMapping, edgeAttributeMapping: AttributeMapping, networkAttributeMapping: AttributeMapping,
        withinNetworkMerge: boolean, attributeValueMatcher: AttributeValueMatcher, attributeMerger: AttributeMerger) {
        this.networkRecords = networkRecords;
        this.matchingAttribute = matchingAttribute
        this.nodeAttributeMapping = nodeAttributeMapping;
        this.edgeAttributeMapping = edgeAttributeMapping;
        this.networkAttributeMapping = networkAttributeMapping;
        this.withinNetworkMerge = withinNetworkMerge;
        this.attributeValueMatcher = attributeValueMatcher;
        this.attributeMerger = attributeMerger;
        this.mergedNetwork = new Object() as NetworkRecord;

    }

    public mergeNetworks(mergedNetwork: IdType, fromNetworks: IdType[], op: MergeOperation,
        subtractOnlyUnconnectedNodes: boolean, nodesOnly: boolean): NetworkRecord {
        // Null checks for required fields...
        if (mergedNetwork == null) {
            throw new Error("Merged networks wasn't created.");
        }
        if (fromNetworks == null || fromNetworks.length == 0) {
            throw new Error("No networks selected.");
        }
        if (op == null) {
            throw new Error("Operation parameter is missing.");
        }
        for (let i = 0; i < fromNetworks.length; i++) {
            if (!this.networkRecords.hasOwnProperty(fromNetworks[i])) {
                throw new Error("Network not found in the network records");
            }
        }
        // preprocess
        this.preprocess(mergedNetwork);
        // get node matching list
        let matchedNodeList = this.getMatchedList(fromNetworks, true);
        let differenceNodeList: Map<IdType, Set<IdType>>[];
        if (op == MergeOperation.Difference && subtractOnlyUnconnectedNodes) {
            differenceNodeList = matchedNodeList;// deep copy
        }

        matchedNodeList = this.selectMatchedGOList(matchedNodeList, op, fromNetworks)
        const mapNN = new Map<IdType, IdType>();
        // merge nodes in the list
        for (let mapNetNode of matchedNodeList) {
            if (mapNetNode == null) {
                continue;
            }
            const node =
                mergeNodes(mapNetNode, node, mergedNetwork);
            for (let map of mapNetNode) {
                for () {
                    mapNN.set(map[0], node);
                }
            }
        }
        // match edges
        const matchedEdgeList = this.getMatchedList(fromNetworks, false);
        // if nodesOnly is true, treat all operations as union operation

        // merge edges
        for (let entry of matchedEdgeList) {

        }
        // Last step -- merge the network attributes
        this.mergeNetworksAttr(fromNetworks, mergedNetwork);
        return this.mergedNetwork;
    }

    private getMatchedList(fromNetworks: IdType[], isNode: boolean): Map<IdType, Set<IdType>>[] {
        let matchedList: Map<IdType, Set<IdType>>[] = [];
        for (let i = 0; i < fromNetworks.length; i++) {
            const net1 = fromNetworks[i];
            let index: number;
            const table = isNode ? this.networkRecords[net1].nodeTable : this.networkRecords[net1].edgeTable;
            if (table == null) {
                throw new Error("Please specify the matching table column first");
            }
            table.rows.forEach((_, go1) => {
                // chech whether any nodes in the matchedNodeList match with
                // this node if yes, add to the list, else add a new map to the list

                let matched = false;
                const lstLen = matchedList.length;
                //The search for a match has been split for nodes and edges. Edges don't need to go through the loop
                //since they can take advantage of node's information in the previous found node match list
                if (isNode) {
                    for (let j = 0; j < lstLen; j++) {
                        const matchedGO: Map<IdType, Set<IdType>> = matchedList[j];
                        for (let entry2 of matchedGO) {
                            if (!this.withinNetworkMerge && net1 === entry2[0]) continue;
                            for (let go2 of entry2[1]) {
                                if (this.matchNodes(net1, go1, entry2[0], go2)) {
                                    index = j;
                                    this.mapNodesIndex.set(go1, j);
                                    matched = true;
                                    break;
                                }
                            }

                        }
                        if (matched) {
                            break;
                        }
                    }
                } else {
                    let index = this.matchEdges();
                    if (index >= 0) {
                        //check if the edge belongs to the same network
                        //if so, the match is not valid
                        if (matchedList[index].has(net1) && matchedList[index].size === 1 && !this.withinNetworkMerge) {
                            matched = true;
                        } else {
                            matched = false;
                        }
                    } else {
                        matched = false;
                    }

                }
                if (!matched) {
                    // no matched node/edge found, add new map to the list
                    const matchedGo = new Map<IdType, Set<IdType>>();
                    let gos1 = new Set<IdType>();
                    gos1.add(go1);
                    matchedGo.set(net1, gos1);
                    if (isNode) {
                        this.mapNodesIndex.set(go1, matchedList.length);
                    }
                    matchedList.push(matchedGo);
                } else {
                    let gos1 = matchedList[index].get(net1);
                    if (gos1 == null) {
                        gos1 = new Set<IdType>();
                        matchedList[index].set(net1, gos1);
                    }
                    gos1.add(go1);
                }
            });

        }
        return matchedList;
    }

    protected matchNodes(net1: IdType, node1: IdType, net2: IdType, node2: IdType): boolean {
        if (net1 == null || node1 == null || net2 == null || node2 == null) {
            throw new Error("Null Pointer Exception");
        }
        const attr1 = this.matchingAttribute.getAttributeForMatchingByNetId(net1);
        const attr2 = this.matchingAttribute.getAttributeForMatchingByNetId(net2);
        const table1 = this.networkRecords[net1].nodeTable;
        const table2 = this.networkRecords[net2].nodeTable;
        if (attr1 == null || attr2 == null || table1 == null || table2 == null)
            throw new Error("Please specify the matching table column first");
        return this.attributeValueMatcher.matched(table1, node1, attr1, table2, node2, attr2);
    }

    protected matchEdges(netId: IdType, edgeId: IdType, position: number): number {
        let index = -1;
        let id1, id2 = 0;
        let mapNodesEdges: Map<IdType, number>;
        let mapNodesDirectedEdges: Map<IdType, number>;

        if (edgeId == null) {
            throw new Error("Null Pointer Exception");
        }

        const i1 = this.networkRecords[netId].network.edges;

        if (i1 == null) {

        }

        if (index === -1) {
            if () {

            }
        }
        return index;
    }

    // use the following java code as a reference for the above TypeScript code:
    // protected int matchEdge( CyNetwork network1, CyEdge e1, int position) {

    // 	int index = -1;
    // 	long id1, id2 = 0;
    // 	Map<Long,Integer> mapNodesEdges = null;
    // 	Map<Long,Integer> mapNodesDirectedEdges = null;
    // 	if (e1 == null ) {
    // 		throw new NullPointerException();
    // 	}

    // 	String i1 = network1.getRow(e1).get(CyEdge.INTERACTION, String.class);


    // 	CyNode source = e1.getSource();
    // 	CyNode target = e1.getTarget();

    // 	if (source == null || target == null ) {
    // 		throw new NullPointerException();
    // 	}

    // 	int iSource = mapNodesIndex.get(source);

    // 	int iTarget = mapNodesIndex.get(target);

    // 	if (e1.isDirected())
    // 	{
    // 		if(i1 == null)
    // 			mapNodesDirectedEdges = mapEdgeDirectedNoInteractions;
    // 		else
    // 			mapNodesDirectedEdges = mapEdgeDirectedInteractions.get(i1);
    // 		id1 = getUniqueIdNumber(iSource, iTarget);
    // 		if( mapNodesDirectedEdges != null)
    // 		{
    // 			//System.out.println("same interaction directed edge: " + i1);
    // 			if(mapNodesDirectedEdges.get(id1) != null)
    // 				index = mapNodesDirectedEdges.get(id1);
    // 		}

    // 	}
    // 	else
    // 	{
    // 		if(i1 == null)
    // 			mapNodesEdges = mapEdgeNoInteractions;
    // 		else
    // 			mapNodesEdges = mapEdgeInteractions.get(i1);
    // 		id1 = getUniqueIdNumber(iSource, iTarget);
    // 		id2 = getUniqueIdNumber(iTarget,iSource);
    // 		if(mapNodesEdges != null)
    // 		{
    // 			//System.out.println("same interaction edge: " + i1);
    // 			if(mapNodesEdges.get(id1) != null && mapNodesEdges.get(id2) != null && mapNodesEdges.get(id1).equals(mapNodesEdges.get(id2)))
    // 				index = mapNodesEdges.get(id1);
    // 		}
    // 	}


    // 	if(index == -1)
    // 	{
    // 		if (e1.isDirected())
    // 		{
    // 			if( mapNodesDirectedEdges != null)
    // 				mapNodesDirectedEdges.put(id1, position);
    // 			else
    // 			{
    // 				mapNodesDirectedEdges = new HashMap<Long,Integer>();
    // 				mapNodesDirectedEdges.put(id1, position);
    // 				mapEdgeDirectedInteractions.put(i1, mapNodesDirectedEdges);
    // 			}
    // 		}
    // 		else
    // 		{
    // 			if( mapNodesEdges != null)
    // 			{
    // 				mapNodesEdges.put(id1, position);
    // 				mapNodesEdges.put(id2, position);
    // 			}
    // 			else
    // 			{
    // 				mapNodesEdges = new HashMap<Long,Integer>();
    // 				mapNodesEdges.put(id1, position);
    // 				mapNodesEdges.put(id2, position);
    // 				mapEdgeInteractions.put(i1, mapNodesEdges);
    // 			}

    // 		}
    // 	}

    // 	return index;
    // }

    protected preprocess(toNetwork: IdType) {
        const nodeTable = TableFn.createTable(toNetwork, this.nodeAttributeMapping.getMergedColumns())
        const edgeTable = TableFn.createTable(toNetwork, this.edgeAttributeMapping.getMergedColumns());
        // this.setAttributeTypes(toNetwork.network.getDefaultNetworkTable(), this.networkAttributeMapping);
    }

    protected mergeNodes() {

        // this.setAttribute();
    }

    protected mergeEdges() {

        // this.setAttribute();
    }

    protected mergeNetworksAttr(fromNetworks: IdType[], newNetId: IdType) {

        // this.setAttribute();
    }

    protected setAttribute(newNetId: IdType, toEntry: IdType, mapNetGOs: Map<IdType, Set<IdType>>, attributeMapping: AttributeMapping) {
        const nattr = attributeMapping.getSizeMergedAttributes();
        for (let i = 0; i < nattr; i++) {
            const attrMerged = this.networkRecords[newNetId].nodeTable.getColumn(attributeMapping.getMergedAttribute(i));
            const mapGOAttr = new Map<IdType, Table>();
            mapNetGOs.forEach((entryNetGOs, net) => {
                const attrName = attributeMapping.getOriginalAttribute(net, i);
                const table = this.networkRecords[net].nodeTable;
                if (attrName != null) {
                    entryNetGOs.forEach((idGO) => {
                        mapGOAttr.set(idGO, table.getColumn(attrName));
                    });
                }
            });
            try {
                this.attributeMerger.mergeAttribute(mapGOAttr, toEntry, attrMerged, this.networkRecords[newNetId]);
            } catch (e) {
                continue;
            }
        }

    }

    private selectMatchedGOList(matchedGOList: Map<IdType, Set<IdType>>[], op: MergeOperation, networks: IdType[]): Map<IdType, Set<IdType>>[] {
        if (matchedGOList == null || op == null) {
            throw new Error("Null Pointer Exception");
        }
        if (op == MergeOperation.Union) {
            return matchedGOList;
        } else if (op == MergeOperation.Intersection) {
            return matchedGOList.filter((entry) => {
                return entry.size === networks.length;
            });
        } else { //Difference
            let resLst: Map<IdType, Set<IdType>>[] = [];
            if (networks.length < 2) {
                return resLst;
            }
            const firstNet = networks[0];
            const secondNet = networks[1];

            return matchedGOList.filter((entry) => {
                return entry.has(firstNet) && !entry.has(secondNet);
            })
        }
    }


}


// use the following Java code as a reference for the above TypeScript code:
