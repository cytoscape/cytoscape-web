
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
import { mergeNetwork } from '../models/Impl/MergeNetwork';
import { Node } from '../../../models/NetworkModel/Node';
import { Column } from '../../../models/TableModel/Column';
import { Edge } from '../../../models/NetworkModel/Edge';
import { createMatchingTable } from '../models/Impl/MatchingTableImpl';
import { MatchingTableRow } from '../models/MatchingTable';
import { IdType } from "../../../models/IdType";
import NetworkFn from "../../../models/NetworkModel";
import { Network } from "../../../models/NetworkModel/Network";

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

describe('Test type coercion during network merge', () => {
    it('should perform the type coercion correctly (1/2)', () => {
        const fromNetworks: IdType[] = ['net1', 'net2']
        const toNetworkId = 'mergedNetwork1'
        const net1: Network = NetworkFn.createNetwork(fromNetworks[0])
        const net2: Network = NetworkFn.createNetwork(fromNetworks[1])
        const mergedNetwork: Network = NetworkFn.createNetwork(toNetworkId)
        const nodeLst1: IdType[] = ['1', '2', '3']
        const nodeLst2: IdType[] = ['4', '5', '6']
        const mergedNodeLst: IdType[] = ['0', '1', '2']
        NetworkFn.addNodes(net1, nodeLst1)
        NetworkFn.addNodes(net2, nodeLst2)
        NetworkFn.addNodes(mergedNetwork, mergedNodeLst)
        const nodeTableRows1 = new Map();
        nodeTableRows1.set(nodeLst1[0], { name: 'node 1', sin_str: 1, sin_bool: true, sin_int: 1, sin_double: 1.1, lst_str: ['a', 'b', 'b'], lst_int: [1, 2], lst_double: [1.1, 2.2], lst_bool: [true, false, true] });
        nodeTableRows1.set(nodeLst1[1], { name: 'node 2', sin_str: 2, sin_bool: false, sin_int: 2, sin_double: 2.2 });
        nodeTableRows1.set(nodeLst1[2], { name: 'node 3', lst_str: ['c', 'd'], lst_int: [3, 4], lst_double: [3.3, 4.4], lst_bool: [false, true] });

        const nodeTableRows2 = new Map();
        nodeTableRows2.set(nodeLst2[0], { name: 'node 1', sin_str: 3, sin_bool: true, sin_int: 3, sin_double: 3.3, lst_str: ['e', 'f'], lst_int: [5, 6], lst_double: [5.5, 6.6], lst_bool: [true, false, false] });
        nodeTableRows2.set(nodeLst2[1], { name: 'node 2', sin_str: 4, sin_bool: false, sin_int: 4, sin_double: 4.4 });
        nodeTableRows2.set(nodeLst2[2], { name: 'node 3', lst_str: ['g', 'h'], lst_int: [7, 8], lst_double: [7.7, 8.8], lst_bool: [false, true] });

        const nodeTable1 = {
            id: fromNetworks[0],
            columns: [{ name: 'name', type: 'string' }, { name: 'sin_str', type: 'string' }, { name: 'sin_bool', type: 'boolean' },
            { name: 'sin_int', type: 'integer' }, { name: 'sin_double', type: 'double' }, { name: 'lst_str', type: 'list_of_string' },
            { name: 'lst_int', type: 'list_of_integer' }, { name: 'lst_double', type: 'list_of_double' }, { name: 'lst_bool', type: 'list_of_boolean' }],
            rows: nodeTableRows1
        };

        const nodeTable2 = {
            id: fromNetworks[1],
            columns: [{ name: 'name', type: 'string' }, { name: 'sin_str', type: 'string' }, { name: 'sin_bool', type: 'boolean' },
            { name: 'sin_int', type: 'integer' }, { name: 'sin_double', type: 'double' }, { name: 'lst_str', type: 'list_of_string' },
            { name: 'lst_int', type: 'list_of_integer' }, { name: 'lst_double', type: 'list_of_double' }, { name: 'lst_bool', type: 'list_of_boolean' }],
            rows: nodeTableRows2
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
        const matchingAttribute = {
            [fromNetworks[0]]: { name: 'name', type: 'string' } as Column,
            [fromNetworks[1]]: { name: 'name', type: 'string' } as Column
        }

        const mergedNodeTableRows = new Map();
        mergedNodeTableRows.set(mergedNodeLst[0], { name: 'node 1', matchingAtt: 'node 1', sin_str: 'true', lst_str1: ['1', '2', 'true', 'false'], lst_str2: ['a', 'b', '5.5', '6.6'], lst_double: [1, 3.3], lst_bool: [true, false] });
        mergedNodeTableRows.set(mergedNodeLst[1], { name: 'node 2', matchingAtt: 'node 2', sin_str: 'false', lst_double: [2, 4.4] });
        mergedNodeTableRows.set(mergedNodeLst[2], { name: 'node 3', matchingAtt: 'node 3', lst_str1: ['3', '4', 'false', 'true'], lst_str2: ['c', 'd', '7.7', '8.8'], lst_bool: [false, true] });

        const mergedNodeTable = {
            id: toNetworkId,
            columns: [{ name: 'matchingAtt', type: 'string' }, { name: 'name', type: 'string' }, { name: 'sin_str', type: 'string' },
            { name: 'lst_str1', type: 'list_of_string' }, { name: 'lst_str2', type: 'list_of_string' }, { name: 'lst_double', type: 'list_of_double' },
            { name: 'lst_bool', type: 'list_of_boolean' }],
            rows: mergedNodeTableRows
        };

        const nodeAttributeMapping = createMatchingTable([
            {
                id: 0, mergedNetwork: 'matchingAtt', type: 'string', hasConflicts: false,
                typeRecord: { [fromNetworks[0]]: 'string', [fromNetworks[1]]: 'string' },
                nameRecord: { [fromNetworks[0]]: 'name', [fromNetworks[1]]: 'name' }
            },
            {
                id: 1, mergedNetwork: 'name', type: 'string', hasConflicts: false,
                typeRecord: { [fromNetworks[0]]: 'string', [fromNetworks[1]]: 'string' },
                nameRecord: { [fromNetworks[0]]: 'name', [fromNetworks[1]]: 'name' }
            },
            {
                id: 2, mergedNetwork: 'sin_str', type: 'string', hasConflicts: false,
                typeRecord: { [fromNetworks[0]]: 'boolean', [fromNetworks[1]]: 'string' },
                nameRecord: { [fromNetworks[0]]: 'sin_bool', [fromNetworks[1]]: 'sin_str' }
            },
            {
                id: 3, mergedNetwork: 'lst_str1', type: 'list_of_string', hasConflicts: false,
                typeRecord: { [fromNetworks[0]]: 'list_of_integer', [fromNetworks[1]]: 'list_of_boolean' },
                nameRecord: { [fromNetworks[0]]: 'lst_int', [fromNetworks[1]]: 'lst_bool' }
            },
            {
                id: 4, mergedNetwork: 'lst_str2', type: 'list_of_string', hasConflicts: false,
                typeRecord: { [fromNetworks[0]]: 'list_of_string', [fromNetworks[1]]: 'list_of_double' },
                nameRecord: { [fromNetworks[0]]: 'lst_str', [fromNetworks[1]]: 'lst_double' }
            },
            {
                id: 5, mergedNetwork: 'lst_double', type: 'list_of_double', hasConflicts: false,
                typeRecord: { [fromNetworks[0]]: 'integer', [fromNetworks[1]]: 'double' },
                nameRecord: { [fromNetworks[0]]: 'sin_int', [fromNetworks[1]]: 'sin_double' }
            },
            {
                id: 6, mergedNetwork: 'lst_bool', type: 'list_of_boolean', hasConflicts: false,
                typeRecord: { [fromNetworks[0]]: 'list_of_boolean', [fromNetworks[1]]: 'list_of_boolean' },
                nameRecord: { [fromNetworks[0]]: 'lst_bool', [fromNetworks[1]]: 'lst_bool' }
            }
        ] as MatchingTableRow[])
        const edgeAttributeMapping = createMatchingTable([])
        const result = mergeNetwork(fromNetworks, toNetworkId, networkRecords, nodeAttributeMapping, edgeAttributeMapping, matchingAttribute)

        expect(result).toEqual({
            network: mergedNetwork,
            nodeTable: mergedNodeTable,
            edgeTable: { id: toNetworkId, columns: [], rows: new Map() } as Table
        })
    });
});
