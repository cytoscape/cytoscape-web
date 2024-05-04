// import { Column } from '../../../models/TableModel/Column'

// export interface AttributeConflictHandler {
//     handleIt(to: string, toAttr: Column, mapFromGOFromAttr: Map<string, Column> | null): boolean;
// }

// export class DefaultAttributeConflictHandler implements AttributeConflictHandler {
//     handleIt(to: string, toColumn: Column, mapFromGOFromAttr: Map<string, Column>): boolean {
//         if (!to || !toColumn || !mapFromGOFromAttr) {
//             throw new Error("All parameters should not be null.");
//         }

//         const table = toColumn.table; // Assuming the table is a property of CyColumn
//         const row: CyRow = table.rows.get(to.id); // Assuming rows is a Map with ID keys
//         const type = this.getColumnType(toColumn); // Define getColumnType method or similar logic

//         if (type === "string") {
//             const toValue = row.get(toColumn.name);
//             const values = new Set<string>();
//             values.add(toValue);

//             mapFromGOFromAttr.forEach((fromColumn, from) => {
//                 const fromRow = fromColumn.table.rows.get(from.id);
//                 const fromValue = fromRow.get(fromColumn.name);
//                 if (fromValue) {
//                     values.add(fromValue);
//                 }
//             });

//             const combinedValues = Array.from(values).join(";");
//             row.set(toColumn.name, combinedValues);
//             return true;
//         }

//         // Extend handling for other types like Integer, Double, Boolean
//         return false;
//     }

//     getColumnType(column: Column): string {
//         // Logic to determine the type based on the column
//         return column.type; // Example assumption
//     }
// }
