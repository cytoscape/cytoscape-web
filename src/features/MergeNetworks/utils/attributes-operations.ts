import { isString, lowerCase } from "lodash";
import { IdType } from "../../../models/IdType";
import TableFn, { Column, ValueType, ValueTypeName } from "../../../models/TableModel";
import { ListOfValueType, SingleValueType } from "../../../models/TableModel/ValueType";
import { isListType, isSingleType } from "../../../models/TableModel/impl/ValueTypeImpl";
import { MatchingTable } from "../models/MatchingTable";

export function preprocess(toNetwork: IdType, nodeCols: Column[], edgeCols: Column[]) {
    const mergedNodeTable = TableFn.createTable(toNetwork, nodeCols);
    const mergedEdgeTable = TableFn.createTable(toNetwork, edgeCols);
    return {
        mergedNodeTable,
        mergedEdgeTable
    }
}

export function castAttributes(toMergeAttr: Record<string, ValueType> | undefined, netId: IdType, matchingTable: MatchingTable, isNode: boolean = true): Record<string, ValueType> {
    const castedAttr: Record<string, ValueType> = {};
    if (toMergeAttr !== undefined) {
        for (const row of (isNode ? matchingTable.matchingTableRows.slice(1) : matchingTable.matchingTableRows)) {
            if (row.hasOwnProperty(netId) && row[netId] !== 'None' && row[netId] !== '' && toMergeAttr.hasOwnProperty(row[netId])) {
                const val = toMergeAttr[row[netId]];
                if (isString(val) && ['null', 'nan', 'none'].includes(val)) {
                    castedAttr[row.mergedNetwork] = castNaN(row.type, val)
                } else {
                    castedAttr[row.mergedNetwork] = typeCoercion(val, row.type);
                }
            }
        }
    }
    return castedAttr;
}

export function addMergedAtt(castedRecord: Record<string, ValueType>, oriMatchingVal: ValueType | undefined, mergedAttCol: Column): Record<string, ValueType> {
    if (oriMatchingVal === undefined) {
        castedRecord[mergedAttCol.name] = castUndefined(mergedAttCol.type);
        return castedRecord;
    }
    castedRecord[mergedAttCol.name] = typeCoercion(oriMatchingVal, mergedAttCol.type);
    return castedRecord;

}

export function attributeValueMatcher(val: ValueType, nodeAttMap: Map<IdType, ValueType>): string {
    if (val !== undefined) {
        for (const entry of nodeAttMap.entries()) {
            if (entry[1] !== '' && val === entry[1]) {
                return entry[0];
            }
        }
    }
    return ''
}


function typeCoercion(val: ValueType, mergedType: ValueTypeName | 'None'): ValueType {
    if (mergedType === 'None') {
        throw new Error('Wrong Merged Type: received None type for the attribute');
    }
    if (isListType(mergedType) && Array.isArray(val)) {
        return listValueTypeCoercion(val, mergedType);
    }
    return singleValueTypeCoercion(val, mergedType);
}

function listValueTypeCoercion(val: ValueType, mergedType: ValueTypeName): ListOfValueType {
    const singleType = mergedType.replace('list_of_', '') as ValueTypeName;

    switch (singleType) {
        case ValueTypeName.String:
            return (val as ValueType[]).map((v) => singleValueTypeCoercion(v, singleType)) as string[];
        case ValueTypeName.Boolean:
            return (val as ValueType[]).map((v) => singleValueTypeCoercion(v, singleType)) as boolean[];
        case ValueTypeName.Double:
        case ValueTypeName.Long:
        case ValueTypeName.Integer:
            return (val as ValueType[]).map((v) => singleValueTypeCoercion(v, singleType)) as number[];
        default:
            throw new Error(`Unsupported list type ${mergedType}`);
    }
}

function singleValueTypeCoercion(val: ValueType, mergedType: ValueTypeName): SingleValueType {
    if (isSingleType(mergedType)) {
        switch (mergedType) {
            case ValueTypeName.String:
                return String(val);
            case ValueTypeName.Boolean:
                if (val === 'true' || val === 'false') return val === 'true';
                if (typeof val === 'boolean') return val;
                throw new Error(`Cannot convert ${val} to Boolean`);
            case ValueTypeName.Double:
                const doubleVal = Number(val);
                if (isNaN(doubleVal)) throw new Error(`Cannot convert ${val} to Double`);
                return doubleVal;
            case ValueTypeName.Long:
            case ValueTypeName.Integer:
                const intVal = parseInt(String(val), 10);
                if (isNaN(intVal)) throw new Error(`Cannot convert ${val} to Integer/Long`);
                return intVal;
            default:
                throw new Error(`Unsupported type ${mergedType}`);
        }
    } else {
        throw new Error(`Cannot convert the attribute value to the type ${mergedType}`);
    }
}

function castNaN(mergedType: ValueTypeName | 'None', val: ValueType) {
    switch (mergedType) {
        case ValueTypeName.String:
        case ValueTypeName.Boolean:
        case ValueTypeName.Double:
        case ValueTypeName.Long:
        case ValueTypeName.Integer:
            return val
        default:
            throw new Error(`Unsupported type ${mergedType}`);
    }
}

function castUndefined(mergedType: ValueTypeName) {
    if (isListType(mergedType)) {
        return [];
    }
    switch (mergedType) {
        case ValueTypeName.String:
        case ValueTypeName.Boolean:
        case ValueTypeName.Double:
        case ValueTypeName.Long:
        case ValueTypeName.Integer:
            return '';
        default:
            throw new Error(`Unsupported type ${mergedType}`);
    }
}