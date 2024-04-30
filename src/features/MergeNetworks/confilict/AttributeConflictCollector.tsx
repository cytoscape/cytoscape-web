import { Column } from '../../../models/TableModel/Column'

export interface AttributeConflictCollector {
    isEmpty(): boolean;
    getMapToGOAttr(): Map<string, Column>;
    getConflicts(toGO: string, toAttr: Column): Map<string, Column> | null;
    addConflict(from: string, fromAttr: Column, to: string, toAttr: Column): void;
    removeConflicts(to: string, toAttr: Column): boolean;
    removeConflict(from: string, fromAttr: Column, to: string, toAttr: Column): boolean;
}

type Conflicts = {
    mapFromGOFromAttr: Map<string, Column>;
}

export class AttributeConflictCollectorImpl implements AttributeConflictCollector {
    private mapToGOToAttrConflicts: Map<string, Map<Column, Conflicts>>;

    constructor() {
        this.mapToGOToAttrConflicts = new Map();
    }

    isEmpty(): boolean {
        return this.mapToGOToAttrConflicts.size === 0;
    }

    getMapToGOAttr(): Map<string, Column> {
        const mapToGOAttr = new Map<string, Column>();
        this.mapToGOToAttrConflicts.forEach((mapToAttrConflicts, go) => {
            mapToAttrConflicts.forEach((conflicts, attr) => {
                mapToGOAttr.set(go, attr);
            });
        });
        return mapToGOAttr;
    }

    getConflicts(to: string, toAttr: Column): Map<string, Column> | null {
        const mapToAttrConflicts = this.mapToGOToAttrConflicts.get(to);
        if (!mapToAttrConflicts) {
            return null;
        }
        const conflicts = mapToAttrConflicts.get(toAttr);
        return conflicts ? conflicts.mapFromGOFromAttr : null;
    }

    addConflict(from: string, fromAttr: Column, to: string, toAttr: Column): void {
        let mapToAttrConflicts = this.mapToGOToAttrConflicts.get(to);
        if (!mapToAttrConflicts) {
            mapToAttrConflicts = new Map();
            this.mapToGOToAttrConflicts.set(to, mapToAttrConflicts);
        }

        let conflicts = mapToAttrConflicts.get(toAttr);
        if (!conflicts) {
            conflicts = { mapFromGOFromAttr: new Map() };
            mapToAttrConflicts.set(toAttr, conflicts);
        }

        conflicts.mapFromGOFromAttr.set(from, fromAttr);
    }

    removeConflicts(to: string, toAttr: Column): boolean {
        const mapToAttrConflicts = this.mapToGOToAttrConflicts.get(to);
        if (!mapToAttrConflicts || !mapToAttrConflicts.has(toAttr)) {
            return false;
        }

        mapToAttrConflicts.delete(toAttr);
        if (mapToAttrConflicts.size === 0) {
            this.mapToGOToAttrConflicts.delete(to);
        }
        return true;
    }

    removeConflict(from: string, fromAttr: Column, to: string, toAttr: Column): boolean {
        const mapToAttrConflicts = this.mapToGOToAttrConflicts.get(to);
        if (!mapToAttrConflicts) {
            return false;
        }

        const conflicts = mapToAttrConflicts.get(toAttr);
        if (!conflicts || !conflicts.mapFromGOFromAttr.delete(from)) {
            return false;
        }

        if (conflicts.mapFromGOFromAttr.size === 0) {
            mapToAttrConflicts.delete(toAttr);
            if (mapToAttrConflicts.size === 0) {
                this.mapToGOToAttrConflicts.delete(to);
            }
        }
        return true;
    }
}
