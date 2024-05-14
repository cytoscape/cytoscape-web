import { IdType } from "../../../models/IdType";
import TableFn, { Column, ValueType } from "../../../models/TableModel";

export function preprocess(toNetwork: IdType, nodeCols: Column[], edgeCols: Column[]) {
    const mergedNodeTable = TableFn.createTable(toNetwork, nodeCols);
    const mergedEdgeTable = TableFn.createTable(toNetwork, edgeCols);
    return {
        mergedNodeTable,
        mergedEdgeTable
    }
}

export function castAttributes(toMergeAttr: Record<string, ValueType> | undefined, attributeMapping: Map<string, Column>): Record<string, ValueType> {
    const castedAttr: Record<string, ValueType> = {};
    if (toMergeAttr !== undefined) {
        for (const [mergedAttName, col] of attributeMapping.entries()) {
            const oriAttName = col.name;
            if (toMergeAttr.hasOwnProperty(oriAttName)) {
                castedAttr[mergedAttName] = toMergeAttr[col.name];
            } else {
                console.log(`Cannot find the attribute ${oriAttName} in the original network`);
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