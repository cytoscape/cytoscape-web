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
        const fromNetworks: IdType[] = ['net1', 'net2', 'net3']
        const toNetworkId = 'mergedNetwork'
        const nodeLst1: Node[] = [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }, { id: 'n4' }]
        const nodeLst2: Node[] = [{ id: 'n5' }, { id: 'n6' }, { id: 'n7' }, { id: 'n8' }]
        const nodeLst3: Node[] = [{ id: 'n7' }, { id: 'n8' }, { id: 'n9' }, { id: 'n10' }, { id: 'n11' }, { id: 'n12' }]
        const mergedNodeLst: Node[] = [{ id: '0' }, { id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }, { id: '6' }]

        const edgeLst1: Edge[] = [{ id: 'e1', s: 'n1', t: 'n2' }, { id: 'e2', s: 'n2', t: 'n3' }, { id: 'e3', s: 'n3', t: 'n4' }]
        const edgeLst2: Edge[] = [{ id: 'e3', s: 'n5', t: 'n6' }, { id: 'e4', s: 'n6', t: 'n7' }, { id: 'e5', s: 'n7', t: 'n5' }, { id: 'e6', s: 'n5', t: 'n8' }]
        const edgeLst3: Edge[] = [{ id: 'e7', s: 'n7', t: 'n8' }, { id: 'e8', s: 'n9', t: 'n8' }, { id: 'e9', s: 'n9', t: 'n10' }, { id: 'e10', s: 'n10', t: 'n11' }, { id: 'e11', s: 'n8', t: 'n12' }]
        const mergedEdgeLst: Edge[] = [{ id: 'e0', s: '0', t: '1' }, { id: 'e1', s: '1', t: '2' }, { id: 'e2', s: '2', t: '3' },
        { id: 'e3', s: '2', t: '0' }, { id: 'e5', s: '1', t: '2' }, { id: 'e6', s: '2', t: '4' },
        { id: 'e8', s: '3', t: '2' }, { id: 'e9', s: '3', t: '5' }, { id: 'e10', s: '5', t: '6' }, { id: 'e11', s: '2', t: '0' }]
        const net1: Network = NetworkFn.createNetworkFromLists(fromNetworks[0], nodeLst1, edgeLst1)
        const net2: Network = NetworkFn.createNetworkFromLists(fromNetworks[1], nodeLst2, edgeLst2)
        const net3: Network = NetworkFn.createNetworkFromLists(fromNetworks[2], nodeLst3, edgeLst3)
        const mergedNetwork: Network = NetworkFn.createNetworkFromLists(toNetworkId, mergedNodeLst, mergedEdgeLst)

        const nodeTableRows1 = new Map();
        nodeTableRows1.set(nodeLst1[0].id, { name: 'node 1', att1: 1, att2: 'd' });
        nodeTableRows1.set(nodeLst1[1].id, { name: 'node 2', att1: 2, att2: 'c' });
        nodeTableRows1.set(nodeLst1[2].id, { name: 'node 3', att1: 3, att2: 'b' });
        nodeTableRows1.set(nodeLst1[3].id, { name: 'node 4', att1: 4, att2: 'a' });

        const nodeTableRows2 = new Map();
        nodeTableRows2.set(nodeLst2[0].id, { name: 'node 5', att1: 3, att3: 'e' });
        nodeTableRows2.set(nodeLst2[1].id, { name: 'node 6', att1: 1, att3: 'f' });
        nodeTableRows2.set(nodeLst2[2].id, { name: 'node 7', att1: 2, att3: 'g' });
        nodeTableRows2.set(nodeLst2[3].id, { name: 'node 8', att3: 'h' });

        const nodeTableRows3 = new Map();
        nodeTableRows3.set(nodeLst3[0].id, { name: 'node 7', att1: 2, att2: '4', att3: 'q' });
        nodeTableRows3.set(nodeLst3[1].id, { name: 'node 8', att1: 3, att2: '2', att3: 'e' });
        nodeTableRows3.set(nodeLst3[2].id, { name: 'node 9', att1: 4, att2: '1', att3: 'f' });
        nodeTableRows3.set(nodeLst3[3].id, { name: 'node 10', att1: 5, att2: '3', att3: 'g' });
        nodeTableRows3.set(nodeLst3[4].id, { name: 'node 8', att2: 'h' });
        nodeTableRows3.set(nodeLst3[5].id, { name: 'node 11', att1: 1, att2: '4', att3: 'q' });

        const mergedNodeTableRows = new Map();
        mergedNodeTableRows.set(mergedNodeLst[0].id, { name: 'node 1', matchingAtt: 1, att1_merged: 1, att22: 'd', att333: 'f' });
        mergedNodeTableRows.set(mergedNodeLst[1].id, { name: 'node 2', matchingAtt: 2, att1_merged: 2, att22: 'c', att333: 'g' });
        mergedNodeTableRows.set(mergedNodeLst[2].id, { name: 'node 3', matchingAtt: 3, att1_merged: 3, att22: 'b', att333: 'e' });
        mergedNodeTableRows.set(mergedNodeLst[3].id, { name: 'node 4', matchingAtt: 4, att1_merged: 4, att22: 'a', att333: 'f' });
        mergedNodeTableRows.set(mergedNodeLst[4].id, { name: 'node 8', matchingAtt: '', att333: 'h' });
        mergedNodeTableRows.set(mergedNodeLst[5].id, { name: 'node 10', matchingAtt: 5, att1_merged: 5, att22: '3', att333: 'g' });
        mergedNodeTableRows.set(mergedNodeLst[6].id, { name: 'node 8', matchingAtt: '', att22: 'h' });

        const edgeTableRows1 = new Map();
        edgeTableRows1.set(edgeLst1[0].id, { name: 'edge 1', interaction: 'a' });
        edgeTableRows1.set(edgeLst1[1].id, { name: 'edge 2', interaction: 'a' });
        edgeTableRows1.set(edgeLst1[2].id, { name: 'edge 3', interaction: 'a' });

        const edgeTableRows2 = new Map();
        edgeTableRows2.set(edgeLst2[0].id, { name: 'edge 4', interaction: 'b', att1: 2 });
        edgeTableRows2.set(edgeLst2[1].id, { name: 'edge 5', interaction: 'a', att1: 3 });
        edgeTableRows2.set(edgeLst2[2].id, { name: 'edge 6', att1: 4 });
        edgeTableRows2.set(edgeLst2[3].id, { name: 'edge 7', interaction: 'a', att1: 5 });

        const edgeTableRows3 = new Map();
        edgeTableRows3.set(edgeLst3[0].id, { name: 'edge 8', att2: 1.33 });
        edgeTableRows3.set(edgeLst3[1].id, { name: 'edge 9', interaction: 'a', att2: 2.33 });
        edgeTableRows3.set(edgeLst3[2].id, { name: 'edge 10', interaction: 'a', att2: 3.33 });
        edgeTableRows3.set(edgeLst3[3].id, { name: 'edge 11', interaction: 'a', att2: 4.33 });
        edgeTableRows3.set(edgeLst3[4].id, { name: 'edge 12', interaction: 'c', att2: 5.33 });

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

        const nodeTable3 = {
            id: fromNetworks[2],
            columns: [{ name: 'name', type: 'string' }, { name: 'att1', type: 'integer' }, { name: 'att2', type: 'string' }, { name: 'att3', type: 'string' }],
            rows: nodeTableRows3
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

        const edgeTable3 = {
            id: fromNetworks[2],
            columns: [{ name: 'name', type: 'string' }, { name: 'interaction', type: 'string' }, { name: 'att2', type: 'double' }],
            rows: edgeTableRows3
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
            [fromNetworks[2]]: {
                network: net3,
                nodeTable: nodeTable3 as Table,
                edgeTable: edgeTable3 as Table
            }
        }
        const nodeAttributeMapping = createMatchingTable([
            { id: 0, [fromNetworks[0]]: 'att1', [fromNetworks[1]]: 'att1', [fromNetworks[2]]: 'att1', mergedNetwork: 'matchingAtt', type: 'integer' },
            { id: 1, [fromNetworks[0]]: 'name', [fromNetworks[1]]: 'name', [fromNetworks[2]]: 'name', mergedNetwork: 'name', type: 'string' },
            { id: 2, [fromNetworks[0]]: 'att1', [fromNetworks[1]]: 'att1', [fromNetworks[2]]: 'att1', mergedNetwork: 'att1_merged', type: 'integer' },
            { id: 3, [fromNetworks[0]]: 'att2', [fromNetworks[1]]: 'None', [fromNetworks[2]]: 'att2', mergedNetwork: 'att22', type: 'string' },
            { id: 4, [fromNetworks[0]]: 'None', [fromNetworks[1]]: 'att3', [fromNetworks[2]]: 'att3', mergedNetwork: 'att333', type: 'string' }
        ] as MatchingTableRow[])
        const edgeAttributeMapping = createMatchingTable([
            { id: 0, [fromNetworks[0]]: 'name', [fromNetworks[1]]: 'name', [fromNetworks[2]]: 'name', mergedNetwork: 'name', type: 'string' },
            { id: 1, [fromNetworks[0]]: 'interaction', [fromNetworks[1]]: 'interaction', [fromNetworks[2]]: 'interaction', mergedNetwork: 'interaction', type: 'string' },
            { id: 2, [fromNetworks[0]]: 'None', [fromNetworks[1]]: 'att1', [fromNetworks[2]]: 'None', mergedNetwork: 'att', type: 'integer' },
            { id: 3, [fromNetworks[0]]: 'None', [fromNetworks[1]]: 'None', [fromNetworks[2]]: 'att2', mergedNetwork: 'att23', type: 'double' },
        ] as MatchingTableRow[])
        const networkAttributeMapping = createMatchingTable([])
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
