import { Column } from '../../../models/TableModel/Column'
import { Identifiable } from '../model/Network';

export interface AttributeConflictCollector {
    isEmpty(): boolean;
    getMapToGOAttr(): Map<Identifiable, Column>;
    getConflicts(toGO: Identifiable, toAttr: Column): Map<Identifiable, Column> | null;
    addConflict(from: Identifiable, fromAttr: Column, to: Identifiable, toAttr: Column): void;
    removeConflicts(to: Identifiable, toAttr: Column): boolean;
    removeConflict(from: Identifiable, fromAttr: Column, to: Identifiable, toAttr: Column): boolean;
}