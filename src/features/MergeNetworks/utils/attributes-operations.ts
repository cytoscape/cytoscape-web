import { IdType } from "../../../models/IdType";
import TableFn, { Column, ValueType } from "../../../models/TableModel";
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
                castedAttr[row.mergedNetwork] = toMergeAttr[row[netId]];
            }
        }
    }
    // Todo: type coercion
    return castedAttr;
}

export function addMergedAtt(castedRecord: Record<string, ValueType>, oriRecord: Record<string, ValueType> | undefined, mergedAttName: string, translatedAtt: string): Record<string, ValueType> {
    if (oriRecord === undefined) {
        throw new Error("Original record not found");
    }
    if (translatedAtt === undefined) {
        throw new Error("Cannot find the translated attribute in the original network");
    }
    let attVal = oriRecord[translatedAtt];
    if (attVal === undefined) {
        console.log("Cannot find the matching attribute in the original network");
        attVal = ''
    }
    castedRecord[mergedAttName] = attVal;
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