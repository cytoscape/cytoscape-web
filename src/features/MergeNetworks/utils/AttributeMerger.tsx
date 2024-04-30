import { Column } from '../../../models/TableModel/Column'
import { Network } from '../../../models/NetworkModel/Network'

export interface AttributeMerger {
    mergeAttribute(sourceAttributes: Map<Node, Column>, targetNode: Node, targetAttr: Column, network: Network): void;
}

export class DefaultAttributeMerger implements AttributeMerger {
    protected conflictCollector: AttributeConflictCollector;

    constructor(conflictCollector: AttributeConflictCollector) {
        this.conflictCollector = conflictCollector;
    }

    mergeAttribute(sourceAttributes: Map<Node, Column>, targetNode: Node, targetAttr: Column, network: Network): void {
        if (!sourceAttributes || !targetNode || !targetAttr) {
            throw new Error("Required parameters cannot be null.");
        }

        const cyRow = network.rows.get(targetNode.id);
        const colType = this.getColumnType(targetAttr);

        sourceAttributes.forEach((fromColumn, fromNode) => {
            const fromTable = fromColumn.table;
            const fromCyRow = fromTable.rows.get(fromNode.id);
            const fromColType = this.getColumnType(fromColumn);

            if (colType === "string") {
                let fromValue = fromCyRow.get(fromColumn.name);
                if (fromValue && fromColType !== colType) {
                    fromValue = this.castService(fromValue, colType);
                }
                const existingValue = cyRow.get(targetAttr.name);

                if (!existingValue) {
                    cyRow.set(targetAttr.name, fromValue);
                } else if (fromValue !== existingValue) {
                    this.conflictCollector.addConflict(fromNode, fromColumn, targetNode, targetAttr);
                }
            } else if (!this.isListType(colType)) {
                let newValue = fromCyRow.get(fromColumn.name);
                const existingValue = cyRow.get(targetAttr.name);

                if (newValue && fromColType !== colType) {
                    newValue = this.castService(newValue, colType);
                }

                if (!existingValue) {
                    cyRow.set(targetAttr.name, newValue);
                } else if (newValue !== existingValue) {
                    this.conflictCollector.addConflict(fromNode, fromColumn, targetNode, targetAttr);
                }
            }
        });
    }

    private getColumnType(column: Column): string {
        // Implement this method
        return "string";
    }

    private castService(value: any, type: string): any {
        // Implement this method
        return value;
    }

    private isListType(type: string): boolean {
        // Implement this method
        return false;
    }
}


// Use the following Java code as a reference for the above TypeScript code:
// import org.cytoscape.model.CyColumn;
// import org.cytoscape.model.CyRow;
// import org.cytoscape.model.CyTable;
// import org.cytoscape.model.CyIdentifiable;
// import org.cytoscape.model.CyNetwork;
// import org.cytoscape.model.subnetwork.CyRootNetwork;
// import org.cytoscape.network.merge.internal.conflict.AttributeConflictCollector;

// import java.util.ArrayList;
// import java.util.List;
// import java.util.Map;

// /**
//  *
//  * 
//  */
// public class DefaultAttributeMerger implements AttributeMerger {

// 	protected final AttributeConflictCollector conflictCollector;

// 	public DefaultAttributeMerger(final AttributeConflictCollector conflictCollector) {
// 		this.conflictCollector = conflictCollector;
// 	}

// 	@Override
// 	public <T extends CyIdentifiable> void mergeAttribute(final Map<T, CyColumn> mapGOAttr, final T graphObject, final CyColumn column,
// 			final CyNetwork network) {
// 		if ((mapGOAttr == null) || (graphObject == null) || (column == null))
// 			throw new java.lang.IllegalArgumentException("Required parameters cannot be null.");

//     // System.out.println("network = "+network);
//     // System.out.println("graphObj = "+graphObject);
// 		final CyRow cyRow = network.getRow(graphObject);
// 		final ColumnType colType = ColumnType.getType(column);

// 		for (Map.Entry<T, CyColumn> entryGOAttr : mapGOAttr.entrySet()) {
// 			final T from = entryGOAttr.getKey();
// 			final CyColumn fromColumn = entryGOAttr.getValue();
// 			final CyTable fromTable = fromColumn.getTable();
//       // System.out.println("from = "+from);
//       // System.out.println("fromTable = "+fromTable);
// 			final CyRow fromCyRow = fromTable.getRow(from.getSUID());
// 			final ColumnType fromColType = ColumnType.getType(fromColumn);

// 			if (colType == ColumnType.STRING) {
// 				Object fromValue = fromCyRow.get(fromColumn.getName(), fromColType.getType());
// 				if (fromValue != null && fromColType != colType) {
// 					fromValue = colType.castService(fromValue);
// 				}
// 				final String o2 = cyRow.get(column.getName(), String.class);

// 				if (o2 == null || o2.length() == 0) { // null or empty attribute
// 					cyRow.set(column.getName(), fromValue);
// 				} else if (fromValue != null && fromValue.equals(o2)) { // TODO: necessary?
// 					// the same, do nothing
// 				} else { // attribute conflict
// 					// add to conflict collector
// 					if (graphObject instanceof CyNetwork) {
// 						if (column.getName().equals(CyNetwork.NAME) || column.getName().equals(CyRootNetwork.SHARED_NAME)) {
// 							// We don't want to mess with the network name
// 							continue;
// 						}
// 					}
// 					conflictCollector.addConflict(from, fromColumn, graphObject, column);
// 				}
// 			} else if (!colType.isList()) { // simple type (Integer, Long, Double, Boolean)
// 				Object o1 = fromCyRow.get(fromColumn.getName(), fromColType.getType());
// 				Object o2 = cyRow.get(column.getName(), colType.getType());
// 				if (o1 != null && fromColType != colType) {
// 					o1 = colType.castService(o1);
// 				}

// 				// Object o2 = cyRow.get(column.getName(), colType.getType());
// 				if (o2 == null) {
// 					cyRow.set(column.getName(), o1);
//           // System.out.println("Setting "+column.getName()+" to "+o1);
// 					// continue;
// 				} else if (o1 == null) {
// 					cyRow.set(column.getName(), o2);
//           // System.out.println("Setting "+column.getName()+" to "+o2);
// 				} else if (o1.equals(o2)) {
// 					// continue; // the same, do nothing
// 				} else { // attribute conflict

//           // System.out.println(column.getName()+" has a conflict");
// 					// add to conflict collector
// 					conflictCollector.addConflict(from, fromColumn, graphObject, column);
// 					// continue;
// 				}
// 			} else { // toattr is list type
// 				// TODO: use a conflict handler to handle this part?
// 				ColumnType plainType = colType.toPlain();

// 				List l2 = cyRow.getList(column.getName(), plainType.getType());
// 				if (l2 == null) {
// 					l2 = new ArrayList<Object>();
// 				}

// 				if (!fromColType.isList()) {
// 					// Simple data type
// 					Object o1 = fromCyRow.get(fromColumn.getName(), fromColType.getType());
// 					if (o1 != null) {
// 						if (plainType != fromColType) {
// 							o1 = plainType.castService(o1);
// 						}

// 						if (!l2.contains(o1)) {
// 							l2.add(o1);
// 						}

// 						if (!l2.isEmpty()) {
// 							cyRow.set(column.getName(), l2);
// 						}
// 					}
// 				} else { // from list
// 					final ColumnType fromPlain = fromColType.toPlain();
// 					final List<?> list = fromCyRow.getList(fromColumn.getName(), fromPlain.getType());
// 					if(list == null)
// 						continue;
					
// 					for (final Object listValue:list) {
// 						if(listValue == null)
// 							continue;
						
// 						final Object validValue;
// 						if (plainType != fromColType) {
// 							validValue = plainType.castService(listValue);
// 						} else {
// 							validValue = listValue;
// 						}
// 						if (!l2.contains(validValue)) {
// 							l2.add(validValue);
// 						}
// 					}
// 				}

// 				if(!l2.isEmpty()) {
// 					cyRow.set(column.getName(), l2);
// 				}
// 			}
// 		}
// 	}
// }