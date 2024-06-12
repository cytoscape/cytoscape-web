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
import { Node } from '../../../models/NetworkModel/Node';
import { Column } from '../../../models/TableModel/Column';
import { Edge } from '../../../models/NetworkModel/Edge';
import { createMatchingTable } from '../models/Impl/MatchingTableImpl';
import { MatchingTableRow } from '../models/MatchingTable';
import { intersectionMerge } from '../models/Impl/ntersectionMerge';

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

describe('intersection merge', () => {

    it('should merge the network nodes and edges successfully', () => {
        const fromNetworks: IdType[] = ['net1', 'net2', 'net3']
        const toNetworkId = 'mergedNetwork'
        const nodeLst1: Node[] = [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }, { id: 'n4' }]
        const nodeLst2: Node[] = [{ id: 'n5' }, { id: 'n6' }, { id: 'n7' }, { id: 'n8' }, { id: 'n9' }]
        const nodeLst3: Node[] = [{ id: 'n10' }, { id: 'n11' }, { id: 'n12' }, { id: 'n13' }, { id: 'n14' }]
        const mergedNodeLst: Node[] = [{ id: '1' }, { id: '2' }, { id: '3' }]

        const edgeLst1: Edge[] = [{ id: 'e1', s: 'n2', t: 'n3' }, { id: 'e2', s: 'n3', t: 'n4' }, { id: 'e3', s: 'n4', t: 'n2' }, { id: 'e0', s: 'n2', t: 'n3' }]
        const edgeLst2: Edge[] = [{ id: 'e4', s: 'n6', t: 'n7' }, { id: 'e5', s: 'n7', t: 'n8' }, { id: 'e6', s: 'n8', t: 'n6' }, { id: 'e0', s: 'n6', t: 'n7' }]
        const edgeLst3: Edge[] = [{ id: 'e7', s: 'n10', t: 'n11' }, { id: 'e8', s: 'n11', t: 'n12' }, { id: 'e9', s: 'n10', t: 'n12' }, { id: 'e0', s: 'n10', t: 'n11' }]
        const mergedEdgeLst: Edge[] = [{ id: 'e0', s: '1', t: '2' }, { id: 'e3', s: '1', t: '2' }]
        const net1: Network = NetworkFn.createNetworkFromLists(fromNetworks[0], nodeLst1, edgeLst1)
        const net2: Network = NetworkFn.createNetworkFromLists(fromNetworks[1], nodeLst2, edgeLst2)
        const net3: Network = NetworkFn.createNetworkFromLists(fromNetworks[2], nodeLst3, edgeLst3)
        const mergedNetwork: Network = NetworkFn.createNetworkFromLists(toNetworkId, mergedNodeLst, mergedEdgeLst)

        const nodeTableRows1 = new Map();
        nodeTableRows1.set(nodeLst1[0].id, { name: 'node 1', int: 1 });
        nodeTableRows1.set(nodeLst1[1].id, { name: 'node 2', int: 2 });
        nodeTableRows1.set(nodeLst1[2].id, { name: 'node 3', });
        nodeTableRows1.set(nodeLst1[3].id, { name: 'node 4', });

        const nodeTableRows2 = new Map();
        nodeTableRows2.set(nodeLst2[0].id, { name: 'node 1', int: 3 });
        nodeTableRows2.set(nodeLst2[1].id, { name: 'node 2', int: 4 });
        nodeTableRows2.set(nodeLst2[2].id, { name: 'node 3', });
        nodeTableRows2.set(nodeLst2[3].id, { name: 'node 4', int: 1 });
        nodeTableRows2.set(nodeLst2[4].id, { name: 'node 5' });

        const nodeTableRows3 = new Map();
        nodeTableRows3.set(nodeLst3[0].id, { name: 'node 2', int: 1 });
        nodeTableRows3.set(nodeLst3[1].id, { name: 'node 3', int: 3 });
        nodeTableRows3.set(nodeLst3[2].id, { name: 'node 4', int: 5 });
        nodeTableRows3.set(nodeLst3[3].id, { name: 'node 5', int: 7 });
        nodeTableRows3.set(nodeLst3[4].id, { name: 'node 6', int: 9 });

        const mergedNodeTableRows = new Map();
        mergedNodeTableRows.set(mergedNodeLst[0].id, { name: 'node 2', matchingAtt: 'node 2', int: 2 });
        mergedNodeTableRows.set(mergedNodeLst[1].id, { name: 'node 3', matchingAtt: 'node 3', int: 3 });
        mergedNodeTableRows.set(mergedNodeLst[2].id, { name: 'node 4', matchingAtt: 'node 4', int: 1 });

        const edgeTableRows1 = new Map();
        edgeTableRows1.set(edgeLst1[0].id, { name: 'edge 1', interaction: 'a' });
        edgeTableRows1.set(edgeLst1[1].id, { name: 'edge 2', interaction: 'a' });
        edgeTableRows1.set(edgeLst1[2].id, { name: 'edge 3', interaction: 'a' });
        edgeTableRows1.set(edgeLst1[3].id, { name: 'edge 0' })

        const edgeTableRows2 = new Map();
        edgeTableRows2.set(edgeLst2[0].id, { name: 'edge 4', interaction: 'a' });
        edgeTableRows2.set(edgeLst2[1].id, { name: 'edge 5', interaction: 'b' });
        edgeTableRows2.set(edgeLst2[2].id, { name: 'edge 6', interaction: 'a' });
        edgeTableRows2.set(edgeLst2[3].id, { name: 'edge 0' })

        const edgeTableRows3 = new Map();
        edgeTableRows3.set(edgeLst3[0].id, { name: 'edge 7', interaction: 'a' });
        edgeTableRows3.set(edgeLst3[1].id, { name: 'edge 8', interaction: 'a' });
        edgeTableRows3.set(edgeLst3[2].id, { name: 'edge 9', interaction: 'a' });
        edgeTableRows3.set(edgeLst3[3].id, { name: 'edge 0' })

        const mergedEdgeTableRows = new Map();
        mergedEdgeTableRows.set(mergedEdgeLst[0].id, { name: 'edge 1', interaction: 'a' });
        mergedEdgeTableRows.set(mergedEdgeLst[1].id, { name: 'edge 0' });

        const nodeTable1 = { id: fromNetworks[0], columns: [{ name: 'name', type: 'string' }, { name: 'int', type: 'integer' }], rows: nodeTableRows1 };
        const nodeTable2 = { id: fromNetworks[1], columns: [{ name: 'name', type: 'string' }, { name: 'int', type: 'integer' }], rows: nodeTableRows2 };
        const nodeTable3 = { id: fromNetworks[2], columns: [{ name: 'name', type: 'string' }, { name: 'int', type: 'integer' }], rows: nodeTableRows3 };
        const mergedNodeTable = { id: toNetworkId, columns: [{ name: 'matchingAtt', type: 'string' }, { name: 'name', type: 'string' }, { name: 'int', type: 'integer' }], rows: mergedNodeTableRows };

        const edgeTable1 = { id: fromNetworks[0], columns: [{ name: 'name', type: 'string' }, { name: 'interaction', type: 'string' }], rows: edgeTableRows1 };
        const edgeTable2 = { id: fromNetworks[1], columns: [{ name: 'name', type: 'string' }, { name: 'interaction', type: 'string' }], rows: edgeTableRows2 };
        const edgeTable3 = { id: fromNetworks[2], columns: [{ name: 'name', type: 'string' }, { name: 'interaction', type: 'string' }], rows: edgeTableRows3 };
        const mergedEdgeTable = { id: toNetworkId, columns: [{ name: 'name', type: 'string' }, { name: 'interaction', type: 'string' }], rows: mergedEdgeTableRows };

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
            {
                id: 0, mergedNetwork: 'matchingAtt', type: 'string', hasConflicts: false,
                typeRecord: { [fromNetworks[0]]: 'string', [fromNetworks[1]]: 'string', [fromNetworks[2]]: 'string' },
                nameRecord: { [fromNetworks[0]]: 'name', [fromNetworks[1]]: 'name', [fromNetworks[2]]: 'name' }
            },
            {
                id: 1, mergedNetwork: 'name', type: 'string', hasConflicts: false,
                typeRecord: { [fromNetworks[0]]: 'string', [fromNetworks[1]]: 'string', [fromNetworks[2]]: 'string' },
                nameRecord: { [fromNetworks[0]]: 'name', [fromNetworks[1]]: 'name', [fromNetworks[2]]: 'name' }
            },
            {
                id: 2, mergedNetwork: 'int', type: 'integer', hasConflicts: false,
                typeRecord: { [fromNetworks[0]]: 'integer', [fromNetworks[1]]: 'integer', [fromNetworks[2]]: 'integer' },
                nameRecord: { [fromNetworks[0]]: 'int', [fromNetworks[1]]: 'int', [fromNetworks[2]]: 'int' }
            }
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
            }
        ] as MatchingTableRow[])
        const matchingAttribute = {
            [fromNetworks[0]]: { name: 'name', type: 'string' } as Column,
            [fromNetworks[1]]: { name: 'name', type: 'string' } as Column,
            [fromNetworks[2]]: { name: 'name', type: 'string' } as Column
        }
        const result = intersectionMerge(fromNetworks, toNetworkId, networkRecords, nodeAttributeMapping, edgeAttributeMapping, matchingAttribute)
        expect(result).toEqual({
            network: mergedNetwork,
            nodeTable: mergedNodeTable,
            edgeTable: mergedEdgeTable
        })
    });

});
