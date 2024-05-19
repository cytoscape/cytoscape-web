import { createMatchingTable } from "../models/Impl/MatchingTableImpl";
import { MatchingTable, MatchingTableRow } from "../models/MatchingTable";
import { mergeNetSummary } from "../models/Impl/MergeNetSummary";
import { NdexNetworkProperty, NdexNetworkSummary } from "../../../models/NetworkSummaryModel";
import { IdType } from "../../../models/IdType";

jest.mock('lodash/cloneDeep', () => ({
    __esModule: true,
    default: jest.fn(deepClone),
}));

describe('mergeNetSummary', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('should merge network summaries with different data types and handle edge cases', () => {
        const fromNetworks: IdType[] = ['net1', 'net2', 'net3'];
        const netSummaryRecord: Record<IdType, NdexNetworkSummary> = {
            [fromNetworks[0]]: {
                version: '1.0',
                description: 'network 1 description',
                properties: [
                    { subNetworkId: null, predicateString: 'att0', dataType: 'boolean', value: false },
                    { subNetworkId: 'subNet1', predicateString: 'att1', dataType: 'integer', value: 1 },
                    { subNetworkId: null, predicateString: 'att2', dataType: 'string', value: 'att2' },
                    { subNetworkId: null, predicateString: 'att3', dataType: 'string', value: 'att33' },
                    { subNetworkId: null, predicateString: 'att4', dataType: 'list_of_string', value: '["value1", "value2"]' },
                ] as NdexNetworkProperty[]
            } as NdexNetworkSummary,
            [fromNetworks[1]]: {
                version: '2.0',
                description: 'network 2 description',
                properties: [
                    { subNetworkId: null, predicateString: 'att0', dataType: 'boolean', value: true },
                    { subNetworkId: 'subNet2', predicateString: 'att1', dataType: 'integer', value: 2 },
                    { subNetworkId: 'subNet2', predicateString: 'att2', dataType: 'string', value: 'different_att2' },
                    { subNetworkId: 'subNet2', predicateString: 'att4', dataType: 'list_of_string', value: '["value2", "value3"]' },
                    { subNetworkId: 'subNet2', predicateString: 'att5', dataType: 'list_of_number', value: [1, 2] },
                    { subNetworkId: 'subNet2', predicateString: 'att6', dataType: 'list_of_boolean', value: [false, true, false] }
                ] as NdexNetworkProperty[]
            } as NdexNetworkSummary,
            [fromNetworks[2]]: {
                version: '3.0',
                description: 'network 3 description',
                properties: [
                    { subNetworkId: null, predicateString: 'att0', dataType: 'boolean', value: true },
                    { subNetworkId: null, predicateString: 'att1', dataType: 'integer', value: 3 },
                    { subNetworkId: null, predicateString: 'att2', dataType: 'string', value: 'att2' },
                    { subNetworkId: 'subNet3', predicateString: 'att3', dataType: 'string', value: 'att3' },
                    { subNetworkId: 'subNet3', predicateString: 'att4', dataType: 'list_of_string', value: '["value4"]' },
                    { subNetworkId: 'subNet3', predicateString: 'att5', dataType: 'list_of_number', value: [2, 3] },
                    { subNetworkId: 'subNet3', predicateString: 'att6', dataType: 'list_of_boolean', value: [false, true, true] }
                ]
            } as NdexNetworkSummary
        };

        const netAttributeMapping: MatchingTable = createMatchingTable([
            { id: 0, [fromNetworks[0]]: 'name', [fromNetworks[1]]: 'name', [fromNetworks[2]]: 'name', mergedNetwork: 'name', type: 'string' },
            { id: 1, [fromNetworks[0]]: 'version', [fromNetworks[1]]: 'version', [fromNetworks[2]]: 'version', mergedNetwork: 'version', type: 'string' },
            { id: 2, [fromNetworks[0]]: 'description', [fromNetworks[1]]: 'description', [fromNetworks[2]]: 'description', mergedNetwork: 'description', type: 'string' },
            { id: 3, [fromNetworks[0]]: 'att0', [fromNetworks[1]]: 'att0', [fromNetworks[2]]: 'att0', mergedNetwork: 'att0', type: 'boolean' },
            { id: 4, [fromNetworks[0]]: 'att1', [fromNetworks[1]]: 'att1', [fromNetworks[2]]: 'att1', mergedNetwork: 'att2', type: 'integer' },
            { id: 5, [fromNetworks[0]]: 'att2', [fromNetworks[1]]: 'att2', [fromNetworks[2]]: 'att2', mergedNetwork: 'att2', type: 'string' },
            { id: 6, [fromNetworks[0]]: 'att3', [fromNetworks[1]]: 'None', [fromNetworks[2]]: 'att3', mergedNetwork: 'att33', type: 'string' },
            { id: 7, [fromNetworks[0]]: 'att4', [fromNetworks[1]]: 'att4', [fromNetworks[2]]: 'att4', mergedNetwork: 'att4', type: 'list_of_string' },
            { id: 8, [fromNetworks[0]]: 'None', [fromNetworks[1]]: 'att5', [fromNetworks[2]]: 'att5', mergedNetwork: 'att5', type: 'list_of_number' },
            { id: 9, [fromNetworks[0]]: 'None', [fromNetworks[1]]: 'att6', [fromNetworks[2]]: 'att6', mergedNetwork: 'att6', type: 'list_of_boolean' }
        ] as MatchingTableRow[]);

        const mergedSummary = mergeNetSummary(fromNetworks, netAttributeMapping, netSummaryRecord);

        const expectedSummary = {
            mergedVersion: '1.0',
            mergedDescription: 'network 1 description',
            flattenedProperties: [
                { subNetworkId: null, predicateString: 'att0', dataType: 'boolean', value: false },
                { subNetworkId: 'subNet1', predicateString: 'att2', dataType: 'integer', value: 1 },
                { subNetworkId: 'subNet2', predicateString: 'att2', dataType: 'string', value: 'att2' },
                { subNetworkId: 'subNet3', predicateString: 'att33', dataType: 'string', value: 'att33' },
                { subNetworkId: 'subNet2', predicateString: 'att4', dataType: 'list_of_string', value: ['value1', 'value2', 'value3', 'value4'] },
                { subNetworkId: 'subNet2', predicateString: 'att5', dataType: 'list_of_number', value: [1, 2, 3] },
                { subNetworkId: 'subNet2', predicateString: 'att6', dataType: 'list_of_boolean', value: [false, true] }
            ]
        };

        expect(mergedSummary).toEqual(expectedSummary);
    });
});

function deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (obj instanceof Map) {
        return new Map(Array.from(obj.entries()).map(([key, value]) => [key, deepClone(value)])) as unknown as T;
    }

    if (obj instanceof Function) {
        return ((...args: any[]) => (obj as Function)(...args)) as unknown as T;
    }

    if (obj instanceof Array) {
        return obj.map((item) => deepClone(item)) as unknown as T;
    }

    if (obj instanceof Object) {
        const cloneO = {} as T;
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                (cloneO as any)[key] = deepClone((obj as any)[key]);
            }
        }
        return cloneO;
    }

    throw new Error('Unable to copy object!');
}