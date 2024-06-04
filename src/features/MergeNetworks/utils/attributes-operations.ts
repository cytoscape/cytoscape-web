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
            if (row.nameRecord.hasOwnProperty(netId) && row.nameRecord[netId] !== 'None' && row.nameRecord[netId] !== '' && toMergeAttr.hasOwnProperty(row.nameRecord[netId])) {
                const val = toMergeAttr[row.nameRecord[netId]];
                if (isString(val) && ['null', 'nan', 'none'].includes(val.toLowerCase())) {
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


export function typeCoercion(val: ValueType, mergedType: ValueTypeName | 'None'): ValueType {
    if (mergedType === 'None') {
        throw new Error('Wrong Merged Type: received None type for the attribute');
    }
    if (isListType(mergedType)) {
        return listValueTypeCoercion(val, mergedType);
    }
    return singleValueTypeCoercion(val, mergedType);
}

function listValueTypeCoercion(val: ValueType, mergedType: ValueTypeName): ListOfValueType {
    const singleType = mergedType.replace('list_of_', '') as ValueTypeName;
    const valArray = Array.isArray(val) ? val : [val];
    switch (singleType) {
        case ValueTypeName.String:
            return valArray.map((v) => singleValueTypeCoercion(v, singleType)) as string[];
        case ValueTypeName.Boolean:
            return valArray.map((v) => singleValueTypeCoercion(v, singleType)) as boolean[];
        case ValueTypeName.Double:
        case ValueTypeName.Long:
        case ValueTypeName.Integer:
            return valArray.map((v) => singleValueTypeCoercion(v, singleType)) as number[];
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


export function isConvertible(typeFrom: ValueTypeName, typeTo: ValueTypeName): boolean {
    if (typeFrom === typeTo) {
        return true;
    }
    if (typeTo === ValueTypeName.String) {
        return true;
    }
    if (typeFrom === ValueTypeName.Integer && (typeTo === ValueTypeName.Long || typeTo === ValueTypeName.Double)) {
        return true;
    }
    if (typeFrom === ValueTypeName.Long && typeTo === ValueTypeName.Double) {
        return true;
    }
    if (isListType(typeTo) && isConvertible(getPlainType(typeFrom), getPlainType(typeTo))) {
        return true;
    }
    return false;
}

export function getPlainType(type: ValueTypeName): ValueTypeName {
    if (isListType(type)) {
        return type.replace('list_of_', '') as ValueTypeName;
    }
    return type;
}

export function getResonableCompatibleConvertionType(types: Set<ValueTypeName>): ValueTypeName {
    let curr = types.values().next().value;
    let li = isListType(curr);
    let ret = getPlainType(curr);
    for (const type of types) {
        const plain = getPlainType(type);
        if (!isConvertible(plain, ret)) {
            ret = isConvertible(ret, plain) ? plain : ValueTypeName.String;
        }
        if (!li) {
            li = isListType(type);
        }
    }
    return li ? `list_of_${ret}` as ValueTypeName : ret;
}

export function getAllConvertiableTypes(types: Set<ValueTypeName | 'None'>): ValueTypeName[] {
    const singleTypes = [ValueTypeName.Boolean, ValueTypeName.Integer, ValueTypeName.Long, ValueTypeName.Double];
    const convertiableSingleTypes: ValueTypeName[] = [];
    let hasListType = false;

    const plainTypes = new Set<ValueTypeName>();
    for (const type of types) {
        if (type === 'None') continue;
        if (isListType(type)) {
            hasListType = true;
            break;
        }
        plainTypes.add(getPlainType(type));
    }

    for (const singleType of singleTypes) {
        let allConvertible = true;
        for (const type of plainTypes) {
            if (!isConvertible(type, singleType)) {
                allConvertible = false;
                break;
            }
        }
        if (allConvertible) {
            convertiableSingleTypes.push(singleType)
        }
    }
    convertiableSingleTypes.push(ValueTypeName.String);
    const convertiableListTypes = convertiableSingleTypes.map(type => `list_of_${type}` as ValueTypeName);

    if (hasListType) {
        return convertiableListTypes;
    } else {
        return [...convertiableSingleTypes, ...convertiableListTypes];
    }
}