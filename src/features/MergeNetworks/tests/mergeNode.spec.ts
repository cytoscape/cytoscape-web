// At the top of your test file before any imports
jest.mock('../../../models/NetworkModel', () => {
    return {
        default: {
            createNetwork: jest.fn(),
            createNetworkFromLists: jest.fn(),
            addNode: jest.fn(),
            addNodes: jest.fn()
        }
    };
});

import { Table } from '../../../models/TableModel';
import { IdType } from '../../../models/IdType';
import { Network } from '../../../models/NetworkModel';
import NetworkFn from '../../../models/NetworkModel';
import { mergeNetwork } from '../models/Impl/MergeNetwork';
import { Node } from '../../../models/NetworkModel/Node';
import { Column } from '../../../models/TableModel/Column';
import { Edge } from '../../../models/NetworkModel/Edge';
import { createMatchingTable } from '../models/Impl/MatchingTableImpl';
import { MatchingTableRow } from '../models/MatchingTable';

beforeEach(() => {
    jest.resetAllMocks();

    (NetworkFn.createNetwork as jest.Mock).mockImplementation((id: IdType) => ({
        id,
        nodes: [],
        edges: []
    }));

    (NetworkFn.addNodes as jest.Mock).mockImplementation((network: Network, nodeIds: IdType[]) => {
        nodeIds.forEach(nodeId => network.nodes.push({ id: nodeId }));
        return network;
    });
    (NetworkFn.addNode as jest.Mock).mockImplementation((network: Network, nodeId: IdType) => {
        network.nodes.push({ id: nodeId });
        return network;
    });
    (NetworkFn.createNetworkFromLists as jest.Mock).mockImplementation((id: IdType, nodes: Node[], edges: Edge[]) => {
        const network: Network = { id, nodes: [], edges: [] };
        nodes.forEach(node => network.nodes.push({ id: node.id }));
        edges.forEach(edge => network.edges.push(edge));
        return network;
    });
});

describe('mergeNetwork', () => {

    it('should merge the network nodes successfully', () => {
        const fromNetworks: IdType[] = ['net1', 'net2']
        const toNetworkId = 'mergedNetwork'
        const net1: Network = NetworkFn.createNetwork(fromNetworks[0])
        const net2: Network = NetworkFn.createNetwork(fromNetworks[1])
        const mergedNetwork: Network = NetworkFn.createNetwork(toNetworkId)
        const nodeLst1: IdType[] = ['1', '2', '3', '4']
        const nodeLst2: IdType[] = ['5', '6', '7', '8']
        const mergedNodeLst: IdType[] = ['0', '1', '2', '3', '4', '5']

        NetworkFn.addNodes(net1, nodeLst1)
        NetworkFn.addNodes(net2, nodeLst2)
        NetworkFn.addNodes(mergedNetwork, mergedNodeLst)

        const nodeTableRows1 = new Map();
        nodeTableRows1.set(nodeLst1[0], { name: 'node 1', att1: 1, att2: 'd' });
        nodeTableRows1.set(nodeLst1[1], { name: 'node 2', att1: 2, att2: 'c' });
        nodeTableRows1.set(nodeLst1[2], { name: 'node 3', att1: 3, att2: 'b' });
        nodeTableRows1.set(nodeLst1[3], { name: 'node 4', att1: 4, att2: 'a' });

        const nodeTableRows2 = new Map();
        nodeTableRows2.set(nodeLst2[0], { name: 'node 5', att1: 5, att3: 'e' });
        nodeTableRows2.set(nodeLst2[1], { name: 'node 2', att1: 6, att3: 'f' });
        nodeTableRows2.set(nodeLst2[2], { name: 'node 1', att1: 7, att3: 'g' });
        nodeTableRows2.set(nodeLst2[3], { name: 'node 8', att1: 8, att3: 'h' });

        const mergedNodeTableRows = new Map();
        mergedNodeTableRows.set(mergedNodeLst[0], { name: 'node 1', matchingAtt: 'node 1', att1_merged: 1, att2: 'd', att33: 'g' });
        mergedNodeTableRows.set(mergedNodeLst[1], { name: 'node 2', matchingAtt: 'node 2', att1_merged: 2, att2: 'c', att33: 'f' });
        mergedNodeTableRows.set(mergedNodeLst[2], { name: 'node 3', matchingAtt: 'node 3', att1_merged: 3, att2: 'b' });
        mergedNodeTableRows.set(mergedNodeLst[3], { name: 'node 4', matchingAtt: 'node 4', att1_merged: 4, att2: 'a' });
        mergedNodeTableRows.set(mergedNodeLst[4], { name: 'node 5', matchingAtt: 'node 5', att1_merged: 5, att33: 'e' });
        mergedNodeTableRows.set(mergedNodeLst[5], { name: 'node 8', matchingAtt: 'node 8', att1_merged: 8, att33: 'h' });

        const nodeTable1 = {
            id: fromNetworks[0],
            columns: [{ name: 'name', type: 'string' }, { name: 'att1', type: 'integer' }, { name: 'att2', type: 'string' }],
            rows: nodeTableRows1
        };

        const nodeTable2 = {
            id: fromNetworks[1],
            columns: [{ name: 'name', type: 'string' }, { name: 'att1', type: 'integer' }, { name: 'att3', type: 'string' }],
            rows: nodeTableRows2
        };

        const mergedNodeTable = {
            id: toNetworkId,
            columns: [{ name: 'matchingAtt', type: 'string' }, { name: 'name', type: 'string' }, { name: 'att1_merged', type: 'integer' }, { name: 'att2', type: 'string' }, { name: 'att33', type: 'string' }],
            rows: mergedNodeTableRows
        };

        const networkRecords = {
            [fromNetworks[0]]: {
                network: net1,
                nodeTable: nodeTable1 as Table,
                edgeTable: { id: fromNetworks[0], columns: [], rows: new Map() } as Table
            },
            [fromNetworks[1]]: {
                network: net2,
                nodeTable: nodeTable2 as Table,
                edgeTable: { id: fromNetworks[0], columns: [], rows: new Map() } as Table
            }
        }
        const nodeAttributeMapping = createMatchingTable([
            { id: 0, [fromNetworks[0]]: 'name', [fromNetworks[1]]: 'name', mergedNetwork: 'matchingAtt', type: 'string' },
            { id: 1, [fromNetworks[0]]: 'name', [fromNetworks[1]]: 'name', mergedNetwork: 'name', type: 'string' },
            { id: 2, [fromNetworks[0]]: 'att1', [fromNetworks[1]]: 'att1', mergedNetwork: 'att1_merged', type: 'integer' },
            { id: 3, [fromNetworks[0]]: 'att2', [fromNetworks[1]]: 'None', mergedNetwork: 'att2', type: 'string' },
            { id: 4, [fromNetworks[0]]: 'None', [fromNetworks[1]]: 'att3', mergedNetwork: 'att33', type: 'string' }
        ] as MatchingTableRow[])
        const edgeAttributeMapping = createMatchingTable([])
        const networkAttributeMapping = createMatchingTable([])
        const matchingAttribute = {
            [fromNetworks[0]]: { name: 'name', type: 'string' } as Column,
            [fromNetworks[1]]: { name: 'name', type: 'string' } as Column
        }
        const result = mergeNetwork(fromNetworks, toNetworkId, networkRecords, nodeAttributeMapping, edgeAttributeMapping, matchingAttribute)
        expect(net1.nodes).toHaveLength(4);
        expect(net2.nodes).toHaveLength(4);
        expect(mergedNetwork.nodes).toHaveLength(6);
        expect(result).toEqual({
            network: mergedNetwork,
            nodeTable: mergedNodeTable,
            edgeTable: { id: toNetworkId, columns: [], rows: new Map() } as Table
        })
    });

});
