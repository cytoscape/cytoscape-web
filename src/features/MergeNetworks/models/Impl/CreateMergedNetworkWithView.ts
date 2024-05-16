import { putNetworkSummaryToDb } from '../../../../store/persist/db'
import { NetworkWithView } from '../../../../utils/cx-utils';
import { mergeNetwork } from './MergeNetwork';
import { IdType } from '../../../../models/IdType';
import { NetworkRecord, NetworktoMerge } from '../DataInterfaceForMerge';
import VisualStyleFn, { VisualStyle } from '../../../../models/VisualStyleModel';
import ViewModelFn, { NetworkView } from '../../../../models/ViewModel';
import { NetworkAttributes } from '../../../../models/NetworkModel';
import { Column } from '../../../../models/TableModel/Column';
import { MatchingTable } from '../MatchingTable';
import { getMatchingTableRows, getAttributeMapping } from './MatchingTableImpl';
import { Visibility } from '../../../../models/NetworkSummaryModel/Visibility';
import cloneDeep from 'lodash/cloneDeep';

export const createMergedNetworkWithView = async (fromNetworks: IdType[], toNetworkId: IdType, networkRecords: Record<IdType, NetworkRecord>,
    nodeAttributeMapping: MatchingTable, edgeAttributeMapping: MatchingTable, networkAttributeMapping: MatchingTable,
    matchingAttribute: Record<IdType, Column>, visualStyle: VisualStyle): Promise<NetworkWithView> => {
    if (fromNetworks.length < 1) {
        throw new Error("No networks to merge");
    }
    if (getMatchingTableRows(nodeAttributeMapping).length < 2) {
        throw new Error("Attributes Length should be greater than 1")
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
    const newNetworkName = 'Merged Network';
    const mergedNetwork: NetworkRecord = mergeNetwork(fromNetworks, toNetworkId, networkRecords,
        nodeAttributeMapping, edgeAttributeMapping, networkAttributeMapping, matchingAttribute)

    const baseNetSummary = 'Merged Network' //todo: fetch from db
    const newNetworkDescription = 'Merged Network'
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
        name: newNetworkName,
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
        properties: [],
        owner: '',
        version: '',
        completed: false,
        visibility: 'PUBLIC' as Visibility,
        nodeCount: newNetwork.nodes.length,
        edgeCount: newNetwork.edges.length,
        description: newNetworkDescription,
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

