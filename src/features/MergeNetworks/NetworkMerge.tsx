import { UnionMerge } from "./UnionMerge";
import { NetworktoMerge } from "./model/Network";

// Type of merge operation
export enum MergeOperation {
    Union = "Union",
    Intersection = "Intersection",
    Difference = "Difference"
}


export function NetworkMerge(toNetwork: NetworktoMerge, fromNetworks: NetworktoMerge[],
    op: MergeOperation, subtractOnlyUnconnectedNodes: boolean, nodesOnly: boolean): NetworktoMerge {

    // Merge the network
    if (op === MergeOperation.Union) {
        return UnionMerge(toNetwork, fromNetworks, subtractOnlyUnconnectedNodes, nodesOnly);
    }

    return toNetwork;
}


