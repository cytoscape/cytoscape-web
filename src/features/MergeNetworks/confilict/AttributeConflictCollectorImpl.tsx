import { Column } from '../../../models/TableModel/Column'
import { Identifiable } from '../model/Network';
import { AttributeConflictCollector } from './AttributeConflictCollector';

type Conflicts = {
    mapFromGOFromAttr: Map<Identifiable, Column>;
}

export class AttributeConflictCollectorImpl implements AttributeConflictCollector {
    private mapToGOToAttrConflicts: Map<Identifiable, Map<Column, Conflicts>>;

    constructor() {
        this.mapToGOToAttrConflicts = new Map();
    }

    isEmpty(): boolean {
        return this.mapToGOToAttrConflicts.size === 0;
    }

    getMapToGOAttr(): Map<Identifiable, Column> {
        const mapToGOAttr = new Map<Identifiable, Column>();
        this.mapToGOToAttrConflicts.forEach((mapToAttrConflicts, go) => {
            mapToAttrConflicts.forEach((conflicts, attr) => {
                mapToGOAttr.set(go, attr);
            });
        });
        return mapToGOAttr;
    }

    getConflicts(to: Identifiable, toAttr: Column): Map<Identifiable, Column> | null {
        const mapToAttrConflicts = this.mapToGOToAttrConflicts.get(to);
        if (!mapToAttrConflicts) {
            return null;
        }
        const conflicts = mapToAttrConflicts.get(toAttr);
        return conflicts ? conflicts.mapFromGOFromAttr : null;
    }

    addConflict(from: Identifiable, fromAttr: Column, to: Identifiable, toAttr: Column): void {
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

    removeConflicts(to: Identifiable, toAttr: Column): boolean {
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

    removeConflict(from: Identifiable, fromAttr: Column, to: Identifiable, toAttr: Column): boolean {
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
