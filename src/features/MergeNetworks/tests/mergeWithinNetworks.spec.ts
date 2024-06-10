// At the top of your test file before any imports
jest.mock('../../../models/NetworkModel', () => {
    return {
        default: {
            createNetwork: jest.fn(),
            createNetworkFromLists: jest.fn(),
            addNode: jest.fn(),
            addNodes: jest.fn(),
            addEdges: jest.fn(),
            addEdge: jest.fn()
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
    (NetworkFn.addEdges as jest.Mock).mockImplementation((network: Network, edges: Edge[]) => {
        edges.forEach(edge => network.edges.push(edge));
        return network;
    });
    (NetworkFn.addEdge as jest.Mock).mockImplementation((network: Network, edge: Edge) => {
        network.edges.push(edge);
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

    it('should merge the network nodes and edges successfully', () => {
        const fromNetworks: IdType[] = ['net1', 'net2']
        const toNetworkId = 'mergedNetwork'
        const nodeLst1: Node[] = [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }]
        const nodeLst2: Node[] = [{ id: 'n4' }, { id: 'n5' }, { id: 'n6' }]
        const mergedNodeLst: Node[] = [{ id: '0' }, { id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }, { id: '6' }]

        const edgeLst1: Edge[] = [{ id: 'e1', s: 'n1', t: 'n2' }, { id: 'e2', s: 'n2', t: 'n3' }, { id: 'e3', s: 'n3', t: 'n4' }]
        const edgeLst2: Edge[] = [{ id: 'e4', s: 'n4', t: 'n5' }, { id: 'e5', s: 'n5', t: 'n6' }, { id: 'e6', s: 'n6', t: 'n5' }]
        const mergedEdgeLst: Edge[] = [{ id: 'e0', s: '0', t: '1' }, { id: 'e1', s: '1', t: '2' }, { id: 'e2', s: '2', t: '3' },
        { id: 'e3', s: '2', t: '0' }, { id: 'e5', s: '1', t: '2' }, { id: 'e6', s: '2', t: '4' },
        { id: 'e8', s: '3', t: '2' }, { id: 'e9', s: '3', t: '5' }, { id: 'e10', s: '5', t: '6' }, { id: 'e11', s: '2', t: '0' }]
        const net1: Network = NetworkFn.createNetworkFromLists(fromNetworks[0], nodeLst1, edgeLst1)
        const net2: Network = NetworkFn.createNetworkFromLists(fromNetworks[1], nodeLst2, edgeLst2)
        const mergedNetwork: Network = NetworkFn.createNetworkFromLists(toNetworkId, mergedNodeLst, mergedEdgeLst)

        const nodeTableRows1 = new Map();
        nodeTableRows1.set(nodeLst1[0].id, { name: 'node 1', att1: 1, att2: 'c' });
        nodeTableRows1.set(nodeLst1[1].id, { name: 'node 2', att1: 2, att2: 'c' });
        nodeTableRows1.set(nodeLst1[2].id, { name: 'node 3', att1: 2, att2: 'b' });

        const nodeTableRows2 = new Map();
        nodeTableRows1.set(nodeLst1[3].id, { name: 'node 4', att1: 2, att2: 'a' });
        nodeTableRows2.set(nodeLst2[0].id, { name: 'node 5', att1: 3, att3: 'c' });
        nodeTableRows2.set(nodeLst2[1].id, { name: 'node 6', att1: 2, att3: 'c' });

        const mergedNodeTableRows = new Map();
        mergedNodeTableRows.set(mergedNodeLst[0].id, { name: 'node 1', matchingAtt: 1, att1_merged: 1, att22: 'd', att333: 'f' });
        mergedNodeTableRows.set(mergedNodeLst[1].id, { name: 'node 2', matchingAtt: 2, att1_merged: 2, att22: 'c', att333: 'g' });
        mergedNodeTableRows.set(mergedNodeLst[2].id, { name: 'node 3', matchingAtt: 3, att1_merged: 3, att22: 'b', att333: 'e' });
        mergedNodeTableRows.set(mergedNodeLst[3].id, { name: 'node 4', matchingAtt: 4, att1_merged: 4, att22: 'a', att333: 'f' });


        const edgeTableRows1 = new Map();
        edgeTableRows1.set(edgeLst1[0].id, { name: 'edge 1', interaction: 'a' });
        edgeTableRows1.set(edgeLst1[1].id, { name: 'edge 2', interaction: 'a' });
        edgeTableRows1.set(edgeLst1[2].id, { name: 'edge 3', interaction: 'a' });

        const edgeTableRows2 = new Map();
        edgeTableRows2.set(edgeLst2[0].id, { name: 'edge 4', interaction: 'b' });
        edgeTableRows2.set(edgeLst2[1].id, { name: 'edge 5', interaction: 'a' });
        edgeTableRows2.set(edgeLst2[2].id, { name: 'edge 6', interaction: 'b' });

        const mergedEdgeTableRows = new Map();
        mergedEdgeTableRows.set(mergedEdgeLst[0].id, { name: 'edge 1', interaction: 'a', att: 3 });
        mergedEdgeTableRows.set(mergedEdgeLst[1].id, { name: 'edge 2', interaction: 'a' });
        mergedEdgeTableRows.set(mergedEdgeLst[2].id, { name: 'edge 3', interaction: 'a' });
        mergedEdgeTableRows.set(mergedEdgeLst[3].id, { name: 'edge 4', interaction: 'b', att: 2 });
        mergedEdgeTableRows.set(mergedEdgeLst[4].id, { name: 'edge 6', att: 4, att23: 1.33 });
        mergedEdgeTableRows.set(mergedEdgeLst[5].id, { name: 'edge 7', interaction: 'a', att: 5 });
        mergedEdgeTableRows.set(mergedEdgeLst[6].id, { name: 'edge 9', interaction: 'a', att23: 2.33 });
        mergedEdgeTableRows.set(mergedEdgeLst[7].id, { name: 'edge 10', interaction: 'a', att23: 3.33 });
        mergedEdgeTableRows.set(mergedEdgeLst[8].id, { name: 'edge 11', interaction: 'a', att23: 4.33 });
        mergedEdgeTableRows.set(mergedEdgeLst[9].id, { name: 'edge 12', interaction: 'c', att23: 5.33 });

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
            columns: [{ name: 'matchingAtt', type: 'integer' }, { name: 'name', type: 'string' }, { name: 'att1_merged', type: 'integer' }, { name: 'att22', type: 'string' }, { name: 'att333', type: 'string' }],
            rows: mergedNodeTableRows
        };

        const edgeTable1 = {
            id: fromNetworks[0],
            columns: [{ name: 'name', type: 'string' }, { name: 'interaction', type: 'string' }],
            rows: edgeTableRows1
        };

        const edgeTable2 = {
            id: fromNetworks[1],
            columns: [{ name: 'name', type: 'string' }, { name: 'interaction', type: 'string' }, { name: 'att1', type: 'integer' }],
            rows: edgeTableRows2
        };

        const mergedEdgeTable = {
            id: toNetworkId,
            columns: [{ name: 'name', type: 'string' }, { name: 'interaction', type: 'string' }, { name: 'att', type: 'integer' }, { name: 'att23', type: 'double' }],
            rows: mergedEdgeTableRows
        };


        const networkRecords = {
            [fromNetworks[0]]: {
                network: net1,
                nodeTable: nodeTable1 as Table,
                edgeTable: edgeTable1 as Table
            },
            [fromNetworks[1]]: {
                network: net2,
                nodeTable: nodeTable2 as Table,
                edgeTable: edgeTable2 as Table
            },
        }
        const nodeAttributeMapping = createMatchingTable([
            {
                id: 0, mergedNetwork: 'matchingAtt', type: 'integer', hasConflicts: false,
                typeRecord: { [fromNetworks[0]]: 'integer', [fromNetworks[1]]: 'integer', [fromNetworks[2]]: 'integer' },
                nameRecord: { [fromNetworks[0]]: 'att1', [fromNetworks[1]]: 'att1', [fromNetworks[2]]: 'att1' }
            },
            {
                id: 1, mergedNetwork: 'name', type: 'string', hasConflicts: false,
                typeRecord: { [fromNetworks[0]]: 'string', [fromNetworks[1]]: 'string', [fromNetworks[2]]: 'string' },
                nameRecord: { [fromNetworks[0]]: 'name', [fromNetworks[1]]: 'name', [fromNetworks[2]]: 'name' }
            },
            {
                id: 2, mergedNetwork: 'att1_merged', type: 'integer', hasConflicts: false,
                typeRecord: { [fromNetworks[0]]: 'integer', [fromNetworks[1]]: 'integer', [fromNetworks[2]]: 'integer' },
                nameRecord: { [fromNetworks[0]]: 'att1', [fromNetworks[1]]: 'att1', [fromNetworks[2]]: 'att1' }
            },
        ] as MatchingTableRow[])
        const edgeAttributeMapping = createMatchingTable([
            {
                id: 0, mergedNetwork: 'name', type: 'string', hasConflicts: false,
                typeRecord: { [fromNetworks[0]]: 'string', [fromNetworks[1]]: 'string', [fromNetworks[2]]: 'string' },
                nameRecord: { [fromNetworks[0]]: 'name', [fromNetworks[1]]: 'name', [fromNetworks[2]]: 'name' }
            },
            {
                id: 1, mergedNetwork: 'interaction', type: 'string', hasConflicts: false,
                typeRecord: { [fromNetworks[0]]: 'string', [fromNetworks[1]]: 'string', [fromNetworks[2]]: 'string' },
                nameRecord: { [fromNetworks[0]]: 'interaction', [fromNetworks[1]]: 'interaction', [fromNetworks[2]]: 'interaction' }
            },
        ] as MatchingTableRow[])
        const matchingAttribute = {
            [fromNetworks[0]]: { name: 'att1', type: 'string' } as Column,
            [fromNetworks[1]]: { name: 'att1', type: 'string' } as Column,
            [fromNetworks[2]]: { name: 'att1', type: 'string' } as Column
        }
        const result = mergeNetwork(fromNetworks, toNetworkId, networkRecords, nodeAttributeMapping, edgeAttributeMapping, matchingAttribute)
        expect(result).toEqual({
            network: mergedNetwork,
            nodeTable: mergedNodeTable,
            edgeTable: mergedEdgeTable
        })
    });

});
