import { IdType } from "../../../models/IdType";
import { Table, ValueType } from "../../../models/TableModel";

export function attributeValueMatcher(val: ValueType, nodeAttMap: Map<IdType, ValueType>): string {
    if (val !== '') {
        for (const entry of nodeAttMap.entries()) {
            if (val === entry[1]) {
                return entry[0];
            }
        }
    }
    return ''
}