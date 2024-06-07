import cloneDeep from 'lodash/cloneDeep';
import { mergeNetwork } from './MergeNetwork';
import { MatchingTable } from '../MatchingTable';
import { IdType } from '../../../../models/IdType';
import { mergeNetSummary } from './MergeNetSummary';
import { NetworkWithView } from '../../../../utils/cx-utils';
import { Column } from '../../../../models/TableModel/Column';
import { putNetworkSummaryToDb } from '../../../../store/persist/db'
import { NetworkAttributes } from '../../../../models/NetworkModel';
import ViewModelFn, { NetworkView } from '../../../../models/ViewModel';
import { MergeType, NetworkRecord, NetworktoMerge } from '../DataInterfaceForMerge';
import { NdexNetworkSummary } from '../../../../models/NetworkSummaryModel';
import { Visibility } from '../../../../models/NetworkSummaryModel/Visibility';
import { getMatchingTableRows, getAttributeMapping } from './MatchingTableImpl';
import VisualStyleFn, { VisualStyle } from '../../../../models/VisualStyleModel';

export const createMergedNetworkWithView = async (fromNetworks: IdType[], toNetworkId: IdType, networkName: string,
    networkRecords: Record<IdType, NetworkRecord>, nodeAttributeMapping: MatchingTable, edgeAttributeMapping: MatchingTable,
    networkAttributeMapping: MatchingTable, matchingAttribute: Record<IdType, Column>, visualStyle: VisualStyle,
    netSummaries: Record<IdType, NdexNetworkSummary>, mergeOpType: MergeType = MergeType.union, mergeWithinNetwork: boolean = false, mergeOnlyNodes: boolean = false
): Promise<NetworkWithView> => {
    if (fromNetworks.length < 1) {
        throw new Error("No networks to merge");
    }
    if (getMatchingTableRows(nodeAttributeMapping).length < 1) {
        throw new Error("The length of node attribute mapping table must be greater than 0")
    }
    for (const netId of fromNetworks) {
        if (!networkRecords[netId]) {
            throw new Error(`Network with id ${netId} not found`);
        }
        if (!getAttributeMapping(nodeAttributeMapping, netId)) {
            throw new Error(`Node attribute mapping for network ${netId} not found`);
        }
        if (!matchingAttribute[netId]) {
            throw new Error(`Matching attribute for network ${netId} not found`);
        }
    }
    const mergedNetwork: NetworkRecord = mergeNetwork(fromNetworks, toNetworkId, networkRecords,
        nodeAttributeMapping, edgeAttributeMapping, matchingAttribute, mergeWithinNetwork)
    const mergedNetSummary = mergeNetSummary(fromNetworks, networkAttributeMapping, netSummaries)

    // todo: merge network attributes also
    const networkAttributes: NetworkAttributes = {
        id: toNetworkId,
        attributes: {},
    }

    const newNetwork = mergedNetwork.network
    const newNodeTable = mergedNetwork.nodeTable
    const newEdgeTable = mergedNetwork.edgeTable

    // Initialize new visual style and network view model
    const newVisualStyle: VisualStyle = visualStyle ? (cloneDeep(visualStyle)) : (VisualStyleFn.createVisualStyle());
    const newNetworkView: NetworkView = ViewModelFn.createViewModel(newNetwork)

    await putNetworkSummaryToDb({
        isNdex: false,
        ownerUUID: toNetworkId,
        name: networkName,
        isReadOnly: false,
        subnetworkIds: [],
        isValid: false,
        warnings: [],
        isShowcase: false,
        isCertified: false,
        indexLevel: '',
        hasLayout: true,
        hasSample: false,
        cxFileSize: 0,
        cx2FileSize: 0,
        properties: mergedNetSummary.flattenedProperties,
        owner: '',
        version: mergedNetSummary.mergedVersion,
        completed: false,
        visibility: 'PUBLIC' as Visibility,
        nodeCount: newNetwork.nodes.length,
        edgeCount: newNetwork.edges.length,
        description: mergedNetSummary.mergedDescription,
        creationTime: new Date(Date.now()),
        externalId: toNetworkId,
        isDeleted: false,
        modificationTime: new Date(Date.now()),
    })

    return {
        network: newNetwork,
        nodeTable: newNodeTable,
        edgeTable: newEdgeTable,
        visualStyle: newVisualStyle,
        networkViews: [newNetworkView],
        networkAttributes,
    }
}

