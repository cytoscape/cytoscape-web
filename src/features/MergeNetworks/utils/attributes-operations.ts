import { isString, lowerCase } from "lodash";
import { IdType } from "../../../models/IdType";
import TableFn, { Column, ValueType, ValueTypeName } from "../../../models/TableModel";
import { ListOfValueType, SingleValueType } from "../../../models/TableModel/ValueType";
import { isListType, isSingleType } from "../../../models/TableModel/impl/ValueTypeImpl";
import { MatchingTable } from "../models/MatchingTable";
import { NetworkRecord } from "../models/DataInterfaceForMerge";

export function preprocess(toNetwork: IdType, nodeCols: Column[], edgeCols: Column[]) {
    const mergedNodeTable = TableFn.createTable(toNetwork, nodeCols);
    const mergedEdgeTable = TableFn.createTable(toNetwork, edgeCols);
    return {
        mergedNodeTable,
        mergedEdgeTable
    }
}

export function checkAttribute(nodeMatchingTable: MatchingTable, edgeMatchingTable: MatchingTable, networkRecords: Record<IdType, NetworkRecord>, netIds: IdType[]): boolean {
    for (const netId of netIds) {
        for (const row of nodeMatchingTable.matchingTableRows) {
            if (!row.nameRecord.hasOwnProperty(netId) || !row.typeRecord.hasOwnProperty(netId) ||
                (row.nameRecord[netId] !== 'None' && !networkRecords[netId]?.nodeTable?.columns.some(col => col.name === row.nameRecord[netId] && col.type === row.typeRecord[netId]))) {
                return true;
            }
        }
        for (const row of edgeMatchingTable.matchingTableRows) {
            if (!row.nameRecord.hasOwnProperty(netId) || !row.typeRecord.hasOwnProperty(netId) ||
                (row.nameRecord[netId] !== 'None' && !networkRecords[netId]?.edgeTable?.columns.some(col => col.name === row.nameRecord[netId] && col.type === row.typeRecord[netId]))) {
                return true;
            }
        }
    }
    return false;
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

export function attributeValueMatcher(val: ValueType, nodeAttMap: Map<SingleValueType, IdType>): string {
    if (val !== undefined) {
        const nodeId = nodeAttMap.get(getKeybyAttribute(val));
        if (nodeId !== undefined) {
            return nodeId;
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

export function getKeybyAttribute(val: ValueType): SingleValueType {
    if (Array.isArray(val)) {
        return stringifyList(val as ListOfValueType);
    }
    return val as SingleValueType;
}

export function stringifyList(val: ListOfValueType): string {
    return val.join(',');
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


export function mergeAttributes(orinalRow: Record<string, ValueType>, castedRecord: Record<string, ValueType>): Record<string, ValueType> {
    const mergedRow = { ...orinalRow }
    Object.entries(castedRecord).forEach(([key, value]) => {
        if (!mergedRow.hasOwnProperty(key)) {
            mergedRow[key] = value;
        } else if (Array.isArray(mergedRow[key]) && Array.isArray(value)) {
            if ((mergedRow[key] as ListOfValueType).every(item => typeof item === typeof value[0])) {
                mergedRow[key] = [...new Set([...(mergedRow[key] as ListOfValueType), ...value])] as ValueType;
            } else {
                throw new Error(`Type mismatch for key ${key}: ${typeof (mergedRow[key] as ListOfValueType)[0]} vs ${typeof value[0]}`);
            }
        }
    });
    //Todo: whether to concat string, the behavior is not clear
    return mergedRow;
}

export function duplicateAttName(mergedAttributes: Column[]): boolean {
    return (new Set(mergedAttributes.map(col => col.name))).size < mergedAttributes.length
}