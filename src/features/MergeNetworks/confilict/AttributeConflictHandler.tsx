import { Column } from '../../../models/TableModel/Column'
import { Identifiable } from '../model/Network';

export interface AttributeConflictHandler {
    handleIt(to: Identifiable, toAttr: Column, mapFromGOFromAttr: Map<Identifiable, Column> | null): boolean;
}
