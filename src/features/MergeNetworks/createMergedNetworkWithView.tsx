import {
    putNetworkToDb,
    putTablesToDb,
    putVisualStyleToDb,
    putNetworkViewToDb,
    putNetworkSummaryToDb,
} from '../../store/persist/db'
import { NetworkWithView } from '../../utils/cx-utils';
import { mergeNetwork } from './mergeNetwork';
import { IdType } from '../../models/IdType';
import { NetworkRecord, NetworktoMerge } from './model/DataInterfaceForMerge';
import VisualStyleFn, { VisualStyle } from '../../models/VisualStyleModel';
import ViewModelFn, { NetworkView } from '../../models/ViewModel';
import { deepClone } from './utils/DeepClone';
import { NetworkAttributes } from '../../models/NetworkModel';
import { useVisualStyleStore } from '../../store/VisualStyleStore';
import { Column } from '../../models/TableModel/Column';

export const createMergedNetworkWithView = async (fromNetworks: IdType[], toNetworkId: IdType, networkRecords: Record<IdType, NetworkRecord>,
    nodeAttributeMapping: Record<IdType, Map<IdType, IdType>>, edgeAttributeMapping: Record<IdType, Map<IdType, IdType>>,
    networkAttributeMapping: Record<IdType, Map<IdType, IdType>>, matchingAttribute: Record<IdType, Column>): Promise<NetworkWithView> => {

    const baseNetworkId = fromNetworks[0]
    const visualStyle = useVisualStyleStore((state) => state.visualStyles[baseNetworkId])

    const newNetworkName = 'Merged Network'
    const mergedNetwork: NetworkRecord = mergeNetwork(fromNetworks, toNetworkId, networkRecords,
        nodeAttributeMapping, edgeAttributeMapping, networkAttributeMapping, matchingAttribute)
    const baseNetSummary = 'Merged Network'
    const newNetworkDescription = 'Merged Network'
    // todo: merge network attributes also
    const networkAttributes: NetworkAttributes = {
        id: toNetworkId,
        attributes: {},
    }

    const newNetwork = mergedNetwork.network
    const newNodeTable = mergedNetwork.nodeTable
    const newEdgeTable = mergedNetwork.edgeTable

    const newVisualStyle: VisualStyle = deepClone(visualStyle) || VisualStyleFn.createVisualStyle();
    const newNetworkView: NetworkView = ViewModelFn.createEmptyViewModel(toNetworkId)

    await putNetworkSummaryToDb({
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
        visibility: 'PUBLIC',
        nodeCount: 0,
        edgeCount: 0,
        description: newNetworkDescription,
        creationTime: new Date(Date.now()),
        externalId: toNetworkId,
        isDeleted: false,
        modificationTime: new Date(Date.now()),
    })
    await putNetworkToDb(newNetwork);
    await putTablesToDb(toNetworkId, newNodeTable, newEdgeTable);
    await putVisualStyleToDb(toNetworkId, newVisualStyle)
    await putNetworkViewToDb(toNetworkId, newNetworkView)

    return {
        network: newNetwork,
        nodeTable: newNodeTable,
        edgeTable: newEdgeTable,
        visualStyle: newVisualStyle,
        networkViews: [newNetworkView],
        networkAttributes,
    }
}

