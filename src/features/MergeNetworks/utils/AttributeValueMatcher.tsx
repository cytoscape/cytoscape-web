import { Column } from "../../../models/TableModel";
import { Table } from "../../../models/TableModel/Table";
import { SingleValueType, ListOfValueType, ValueType } from "../../../models/TableModel/ValueType";
import { ColumnType } from "../utils/ColumnType";

export interface AttributeValueMatcher {
    matched(table1: Table, entry1: string, attr1: Column, table2: Table, entry2: string, attr2: Column): boolean;
}

export class DefaultAttributeValueMatcher implements AttributeValueMatcher {
    matched(table1: Table, entry1: string, attr1: Column, table2: Table, entry2: string, attr2: Column): boolean {
        if ((table1 == null) || (entry1 == null) || (attr1 == null) || (table2 == null) || (entry2 == null) || (attr2 == null))
            throw new Error("Null argument.");

        // Todo: check if the following line is correct
        // if (entry1 == entry2 && attr1 == attr2)
        //     return true;

        const row1 = table1.rows.get(entry1);
        const row2 = table2.rows.get(entry2);

        if (row1 == null || row2 == null) {
            return false;
        }

        const type1 = attr1.type;
        const type2 = attr2.type;

        // only support matching between simple types and simple lists
        if (!Array.isArray(type1) && !Array.isArray(type2)) {
            // simple type
            const val1 = row1[attr1.name];
            const val2 = row1[attr1.name];

            if (val1 == null || val2 == null) {
                return false;
            } else {
                return val1 === val2;
            }
        } else if (Array.isArray(type1) && Array.isArray(type2)) {
            // Both are arrays, comparing each element
            const list1: ListOfValueType = row1[attr1.name] as ListOfValueType;
            const list2: ListOfValueType = row2[attr2.name] as ListOfValueType;

            if (!list1 || !list2 || list1.length !== list2.length) {
                return false;
            }

            for (let i = 0; i < list1.length; i++) {
                if (list1[i] !== list2[i]) {
                    return false;
                }
            }
            return true;
        } else {
            // One is an array and the other is not
            let list: ListOfValueType;
            let singleValue: SingleValueType;

            if (Array.isArray(type1)) {
                list = row1[attr1.name] as ListOfValueType;
                singleValue = row2[attr2.name] as SingleValueType;
            } else {
                list = row2[attr2.name] as ListOfValueType;
                singleValue = row1[attr1.name] as SingleValueType;
            }

            if (!Array.isArray(list) || singleValue === undefined) {
                return false;
            }
            return list.some(element => element === singleValue);
        }
    }
}
