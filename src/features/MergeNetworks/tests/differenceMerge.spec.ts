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
import { differenceMerge } from '../models/Impl/DifferenceMerge';

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
    it('should merge the networks successfully when only remove nodes if all their edges are being subtracted, too', () => {
        const fromNetworks: IdType[] = ['net1', 'net2']
        const toNetworkId = 'mergedNetwork'
        const nodeLst1: Node[] = [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }, { id: 'n4' }, { id: 'n5' }, { id: 'n6' }]
        const nodeLst2: Node[] = [{ id: 'n7' }, { id: 'n8' }, { id: 'n9' }, { id: 'n0' }]
    
        const edgeLst1: Edge[] = [{ id: 'e1', s: 'n1', t: 'n2' }, { id: 'e2', s: 'n2', t: 'n3' }, { id: 'e3', s: 'n3', t: 'n4' }, 
                                    { id: 'e4', s: 'n4', t: 'n1' },{ id: 'e5', s: 'n1', t: 'n3' }, { id: 'e6', s: 'n2', t: 'n4' },
                                    { id: 'e7', s: 'n4', t: 'n5' }, { id: 'e8', s: 'n5', t: 'n6' }]
        const edgeLst2: Edge[] = [{ id: 'e1', s: 'n7', t: 'n8' }, { id: 'e2', s: 'n9', t: 'n8' }, { id: 'e3', s: 'n9', t: 'n0' },
                                    { id: 'e4', s: 'n0', t: 'n7' },{ id: 'e5', s: 'n7', t: 'n9' },{ id: 'e6', s: 'n8', t: 'n0' }]
        const net1: Network = NetworkFn.createNetworkFromLists(fromNetworks[0], nodeLst1, edgeLst1)
        const net2: Network = NetworkFn.createNetworkFromLists(fromNetworks[1], nodeLst2, edgeLst2)
    
        const nodeTableRows1 = new Map();
        nodeTableRows1.set(nodeLst1[0].id, { name: 'node 1'});
        nodeTableRows1.set(nodeLst1[1].id, { name: 'node 2'});
        nodeTableRows1.set(nodeLst1[2].id, { name: 'node 3'});
        nodeTableRows1.set(nodeLst1[3].id, { name: 'node 4'});
        nodeTableRows1.set(nodeLst1[4].id, { name: 'node 5'});
        nodeTableRows1.set(nodeLst1[5].id, { name: 'node 6'});
    
        const nodeTableRows2 = new Map();
        nodeTableRows2.set(nodeLst2[0].id, { name: 'node 1'});
        nodeTableRows2.set(nodeLst2[1].id, { name: 'node 2' });
        nodeTableRows2.set(nodeLst2[2].id, { name: 'node 3' });
        nodeTableRows2.set(nodeLst2[3].id, { name: 'node 4' });
    
        const edgeTableRows1 = new Map();
        edgeTableRows1.set(edgeLst1[0].id, { name: 'edge 1', interaction: 'a' });
        edgeTableRows1.set(edgeLst1[1].id, { name: 'edge 2', interaction: 'a' });
        edgeTableRows1.set(edgeLst1[2].id, { name: 'edge 3', interaction: 'a' });
        edgeTableRows1.set(edgeLst1[3].id, { name: 'edge 4', interaction: 'a' });
        edgeTableRows1.set(edgeLst1[4].id, { name: 'edge 5', interaction: 'a' });
        edgeTableRows1.set(edgeLst1[5].id, { name: 'edge 6', interaction: 'a' });
        edgeTableRows1.set(edgeLst1[6].id, { name: 'edge 7', interaction: 'a' });
        edgeTableRows1.set(edgeLst1[7].id, { name: 'edge 8', interaction: 'a' });
    
        const edgeTableRows2 = new Map();
        edgeTableRows2.set(edgeLst2[0].id, { name: 'edge 1', interaction: 'a' });
        edgeTableRows2.set(edgeLst2[1].id, { name: 'edge 2', interaction: 'a' });
        edgeTableRows2.set(edgeLst2[2].id, { name: 'edge 3', interaction: 'a' });
        edgeTableRows2.set(edgeLst2[3].id, { name: 'edge 4', interaction: 'a' });
        edgeTableRows2.set(edgeLst2[4].id, { name: 'edge 5', interaction: 'a' });
        edgeTableRows2.set(edgeLst2[5].id, { name: 'edge 6', interaction: 'b' });
    
        const nodeTable1 = { id: fromNetworks[0], columns: [{ name: 'name', type: 'string' }], rows: nodeTableRows1 };
        const nodeTable2 = { id: fromNetworks[1], columns: [{ name: 'name', type: 'string' }], rows: nodeTableRows2 };
    
        const edgeTable1 = { id: fromNetworks[0], columns: [{ name: 'name', type: 'string' }, { name: 'interaction', type: 'string' }], rows: edgeTableRows1 };
        const edgeTable2 = { id: fromNetworks[1], columns: [{ name: 'name', type: 'string' }, { name: 'interaction', type: 'string' }], rows: edgeTableRows2 };
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
            [fromNetworks[1]]: { name: 'name', type: 'string' } as Column
        }
        const mergedNodeLst: Node[] = [{ id: '4' }, { id: '5' }]
        const mergedEdgeLst: Edge[] = [{ id: 'e0', s: '4', t: '5' }]
        const mergedNetwork: Network = NetworkFn.createNetworkFromLists(toNetworkId, mergedNodeLst, mergedEdgeLst)
        const mergedNodeTableRows = new Map();
        mergedNodeTableRows.set(mergedNodeLst[0].id, { name: 'node 5', matchingAtt: 'node 5' });
        mergedNodeTableRows.set(mergedNodeLst[1].id, { name: 'node 6', matchingAtt: 'node 6' });
        const mergedNodeTable = { id: toNetworkId, columns: [{ name: 'matchingAtt', type: 'string' }, { name: 'name', type: 'string' }], rows: mergedNodeTableRows };

        const mergedEdgeTableRows = new Map();
        mergedEdgeTableRows.set(mergedEdgeLst[0].id, { name: 'edge 8', interaction: 'a' });
        const mergedEdgeTable = { id: toNetworkId, columns: [{ name: 'name', type: 'string' }, { name: 'interaction', type: 'string' }], rows: mergedEdgeTableRows };
        const result = differenceMerge(fromNetworks, toNetworkId, networkRecords, nodeAttributeMapping, edgeAttributeMapping, matchingAttribute, false, false, true)
        expect(result).toEqual({
            network: mergedNetwork,
            nodeTable: mergedNodeTable,
            edgeTable: mergedEdgeTable
        })
    });
    it('should merge the networks successfully when remove all nodes that are in the second network', () => {
        const fromNetworks: IdType[] = ['net1', 'net2']
        const toNetworkId = 'mergedNetwork'
        const nodeLst1: Node[] = [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }, { id: 'n4' }, { id: 'n5' }, { id: 'n6' }]
        const nodeLst2: Node[] = [{ id: 'n7' }, { id: 'n8' }, { id: 'n9' }, { id: 'n0' }]
    
        const edgeLst1: Edge[] = [{ id: 'e1', s: 'n1', t: 'n2' }, { id: 'e2', s: 'n2', t: 'n3' }, { id: 'e3', s: 'n3', t: 'n4' }, 
                                    { id: 'e4', s: 'n4', t: 'n1' },{ id: 'e5', s: 'n1', t: 'n3' }, { id: 'e6', s: 'n2', t: 'n4' },
                                    { id: 'e7', s: 'n4', t: 'n5' }, { id: 'e8', s: 'n5', t: 'n6' }]
        const edgeLst2: Edge[] = [{ id: 'e1', s: 'n7', t: 'n8' }, { id: 'e2', s: 'n9', t: 'n8' }, { id: 'e3', s: 'n9', t: 'n0' },
                                    { id: 'e4', s: 'n0', t: 'n7' },{ id: 'e5', s: 'n7', t: 'n9' },{ id: 'e6', s: 'n8', t: 'n0' }]
        const net1: Network = NetworkFn.createNetworkFromLists(fromNetworks[0], nodeLst1, edgeLst1)
        const net2: Network = NetworkFn.createNetworkFromLists(fromNetworks[1], nodeLst2, edgeLst2)
    
        const nodeTableRows1 = new Map();
        nodeTableRows1.set(nodeLst1[0].id, { name: 'node 1'});
        nodeTableRows1.set(nodeLst1[1].id, { name: 'node 2'});
        nodeTableRows1.set(nodeLst1[2].id, { name: 'node 3'});
        nodeTableRows1.set(nodeLst1[3].id, { name: 'node 4'});
        nodeTableRows1.set(nodeLst1[4].id, { name: 'node 5'});
        nodeTableRows1.set(nodeLst1[5].id, { name: 'node 6'});
    
        const nodeTableRows2 = new Map();
        nodeTableRows2.set(nodeLst2[0].id, { name: 'node 1'});
        nodeTableRows2.set(nodeLst2[1].id, { name: 'node 2' });
        nodeTableRows2.set(nodeLst2[2].id, { name: 'node 3' });
        nodeTableRows2.set(nodeLst2[3].id, { name: 'node 4' });
    
        const edgeTableRows1 = new Map();
        edgeTableRows1.set(edgeLst1[0].id, { name: 'edge 1', interaction: 'a' });
        edgeTableRows1.set(edgeLst1[1].id, { name: 'edge 2', interaction: 'a' });
        edgeTableRows1.set(edgeLst1[2].id, { name: 'edge 3', interaction: 'a' });
        edgeTableRows1.set(edgeLst1[3].id, { name: 'edge 4', interaction: 'a' });
        edgeTableRows1.set(edgeLst1[4].id, { name: 'edge 5', interaction: 'a' });
        edgeTableRows1.set(edgeLst1[5].id, { name: 'edge 6', interaction: 'a' });
        edgeTableRows1.set(edgeLst1[6].id, { name: 'edge 7', interaction: 'a' });
        edgeTableRows1.set(edgeLst1[7].id, { name: 'edge 8', interaction: 'a' });
    
        const edgeTableRows2 = new Map();
        edgeTableRows2.set(edgeLst2[0].id, { name: 'edge 1', interaction: 'a' });
        edgeTableRows2.set(edgeLst2[1].id, { name: 'edge 2', interaction: 'a' });
        edgeTableRows2.set(edgeLst2[2].id, { name: 'edge 3', interaction: 'a' });
        edgeTableRows2.set(edgeLst2[3].id, { name: 'edge 4', interaction: 'a' });
        edgeTableRows2.set(edgeLst2[4].id, { name: 'edge 5', interaction: 'a' });
        edgeTableRows2.set(edgeLst2[5].id, { name: 'edge 6', interaction: 'b' });
    
        const nodeTable1 = { id: fromNetworks[0], columns: [{ name: 'name', type: 'string' }], rows: nodeTableRows1 };
        const nodeTable2 = { id: fromNetworks[1], columns: [{ name: 'name', type: 'string' }], rows: nodeTableRows2 };
    
        const edgeTable1 = { id: fromNetworks[0], columns: [{ name: 'name', type: 'string' }, { name: 'interaction', type: 'string' }], rows: edgeTableRows1 };
        const edgeTable2 = { id: fromNetworks[1], columns: [{ name: 'name', type: 'string' }, { name: 'interaction', type: 'string' }], rows: edgeTableRows2 };
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
            [fromNetworks[1]]: { name: 'name', type: 'string' } as Column
        }
        const mergedNodeLst: Node[] = [{ id: '4' }, { id: '5' }, { id: '1' }, {id:'2'}, {id:'3'}]
        const mergedEdgeLst: Edge[] = [{ id: 'e0', s: '1', t: '2' }, { id: 'e1', s: '1', t: '3' }, { id: 'e2', s: '3', t: '4' },
                                        { id: 'e3', s: '4', t: '5' }]
        const mergedNetwork: Network = NetworkFn.createNetworkFromLists(toNetworkId, mergedNodeLst, mergedEdgeLst)
        const mergedNodeTableRows = new Map();
        mergedNodeTableRows.set(mergedNodeLst[2].id, { name: 'node 2', matchingAtt: "node 2"});
        mergedNodeTableRows.set(mergedNodeLst[3].id, { name: 'node 3', matchingAtt: "node 3"});
        mergedNodeTableRows.set(mergedNodeLst[4].id, { name: 'node 4', matchingAtt: "node 4"});
        mergedNodeTableRows.set(mergedNodeLst[0].id, { name: 'node 5', matchingAtt: "node 5"});
        mergedNodeTableRows.set(mergedNodeLst[1].id, { name: 'node 6', matchingAtt: "node 6"});

        const mergedNodeTable = { id: toNetworkId, columns: [{ name: 'matchingAtt', type: 'string' }, { name: 'name', type: 'string' }], rows: mergedNodeTableRows };

        const mergedEdgeTableRows = new Map();
        mergedEdgeTableRows.set(mergedEdgeLst[0].id, { name: 'edge 2', interaction: 'a' });
        mergedEdgeTableRows.set(mergedEdgeLst[1].id, { name: 'edge 6', interaction: 'a' });
        mergedEdgeTableRows.set(mergedEdgeLst[2].id, { name: 'edge 7', interaction: 'a' });
        mergedEdgeTableRows.set(mergedEdgeLst[3].id, { name: 'edge 8', interaction: 'a' });


        const mergedEdgeTable = { id: toNetworkId, columns: [{ name: 'name', type: 'string' }, { name: 'interaction', type: 'string' }], rows: mergedEdgeTableRows };
        const result = differenceMerge(fromNetworks, toNetworkId, networkRecords, nodeAttributeMapping, edgeAttributeMapping, matchingAttribute)
        expect(result).toEqual({
            network: mergedNetwork,
            nodeTable: mergedNodeTable,
            edgeTable: mergedEdgeTable
        })
    });
});
