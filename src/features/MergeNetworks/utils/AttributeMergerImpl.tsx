
import { AttributeMerger } from './AttributeMerger';
import { Column } from '../../../models/TableModel/Column'
import { Table } from '../../../models/TableModel/Table'
import { Network } from '../../../models/NetworkModel/Network'

import { AttributeConflictCollector } from '../confilict/AttributeConflictCollector'; // Define or import this as needed

interface Identifiable {
    id: number; // Assuming a simple identity structure
}

type CyRow = Map<string, any>; // Simplifying CyRow as a Map for attribute storage
type CyTable = Table; // Assuming 'Table' fits the needed structure
type CyNetwork = Network; // Assuming 'Network' fits the needed structure

class DefaultAttributeMerger implements AttributeMerger {
    protected conflictCollector: AttributeConflictCollector;

    constructor(conflictCollector: AttributeConflictCollector) {
        this.conflictCollector = conflictCollector;
    }

    mergeAttribute<T extends Identifiable>(mapGOAttr: Map<T, Column>, graphObject: T, column: Column, network: CyNetwork): void {
        if (!mapGOAttr || !graphObject || !column) {
            throw new Error("Required parameters cannot be null.");
        }

        const cyRow = network.rows.get(graphObject.id); // Assuming 'rows' is a Map in Network
        const colType = this.getColumnType(column); // You'll need to define how to determine column types

        mapGOAttr.forEach((fromColumn, from) => {
            const fromTable = fromColumn.table; // Assuming you can derive table from column
            const fromCyRow = fromTable.rows.get(from.id);
            const fromColType = this.getColumnType(fromColumn);

            if (colType === "string") {
                let fromValue = fromCyRow.get(fromColumn.name);
                if (fromValue && fromColType !== colType) {
                    fromValue = this.castService(fromValue, colType);
                }
                const existingValue = cyRow.get(column.name);

                if (!existingValue) {
                    cyRow.set(column.name, fromValue);
                } else if (fromValue !== existingValue) {
                    this.conflictCollector.addConflict(from, fromColumn, graphObject, column);
                }
            } else if (!this.isListType(colType)) {
                let newValue = fromCyRow.get(fromColumn.name);
                const existingValue = cyRow.get(column.name);

                if (newValue && fromColType !== colType) {
                    newValue = this.castService(newValue, colType);
                }

                if (!existingValue) {
                    cyRow.set(column.name, newValue);
                } else if (newValue !== existingValue) {
                    this.conflictCollector.addConflict(from, fromColumn, graphObject, column);
                }
            } else {
                // Handle list types
                let currentList = cyRow.get(column.name) || [];
                if (!this.isListType(fromColType)) {
                    let newValue = fromCyRow.get(fromColumn.name);
                    if (newValue && this.getColumnType(fromColumn) !== colType) {
                        newValue = this.castService(newValue, colType);
                    }
                    if (!currentList.includes(newValue)) {
                        currentList.push(newValue);
                    }
                } else {
                    const newList = fromCyRow.get(fromColumn.name) || [];
                    newList.forEach((item: any) => {
                        let validItem = item;
                        if (this.getColumnType(fromColumn) !== colType) {
                            validItem = this.castService(item, colType);
                        }
                        if (!currentList.includes(validItem)) {
                            currentList.push(validItem);
                        }
                    });
                }
                cyRow.set(column.name, currentList);
            }
        });
    }

    getColumnType(column: Column): string {
        // Define this based on your application's needs
        return column.type;
    }

    castService(value: any, type: string): any {
        // Implement type casting logic based on your application's needs
        return value;
    }

    isListType(type: string): boolean {
        // Define logic to determine if the type is a list type
        return type.endsWith('[]'); // Simple example
    }
}
