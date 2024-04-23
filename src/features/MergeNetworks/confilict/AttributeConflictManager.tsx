import { AttributeConflictCollector } from './AttributeConflictCollector';
import { AttributeConflictHandler } from './AttributeConflictHandler';

export class AttributeConflictManager {
    private conflictCollector: AttributeConflictCollector;
    private conflictHandlers: AttributeConflictHandler[];

    constructor(conflictCollector: AttributeConflictCollector, conflictHandlers: AttributeConflictHandler[]) {
        if (!conflictCollector || !conflictHandlers) {
            throw new Error("Parameters cannot be null.");
        }
        if (conflictHandlers.length === 0) {
            throw new Error("No conflict handler provided.");
        }

        this.conflictCollector = conflictCollector;
        this.conflictHandlers = conflictHandlers;
    }

    handleConflicts(): void {
        const mapToIDToAttr = this.conflictCollector.getMapToGOAttr();
        mapToIDToAttr.forEach((toAttr, toID) => {
            const mapFromIDFromAttr = this.conflictCollector.getConflicts(toID, toAttr);
            for (const handler of this.conflictHandlers) {
                if (handler.handleIt(toID, toAttr, mapFromIDFromAttr)) {
                    this.conflictCollector.removeConflicts(toID, toAttr);
                    break;
                }
            }
        });
    }
}
