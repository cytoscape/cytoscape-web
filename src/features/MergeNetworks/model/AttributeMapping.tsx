import { networkWithView, CyTable } from 'cytoscape';
import { ColumnType } from './ColumnType';

enum ColumnType {
    STRING,
    INTEGER,
    BOOLEAN,
    DOUBLE,
    LIST_STRING,
}

// Interface for the AttributeMapping
export interface AttributeMapping {
    getCyTable(net: CyNetwork): CyTable;
    getMergedAttributes(): string[];
    getSizeMergedAttributes(): number;
    getMergedAttribute(index: number): string;
    getMergedAttributeIndex(attribute: string): number;
    setMergedAttribute(index: number, attributeName: string): string;
    getMergedAttributeType(index: number): ColumnType;
    getMergedAttributeTypeByName(mergedAttributeName: string): ColumnType;
    setMergedAttributeType(index: number, type: ColumnType): boolean;
    setMergedAttributeTypeByName(mergedAttributeName: string, type: ColumnType): boolean;
    getMergedAttributeMutability(index: number): boolean;
    getMergedAttributeMutabilityByName(mergedAttributeName: string): boolean;
    setMergedAttributeMutability(index: number, isImmutable: boolean): void;
    setMergedAttributeMutabilityByName(mergedAttributeName: string, isImmutable: boolean): void;
    containsMergedAttribute(attributeName: string): boolean;
    getNetworkSet(): Set<CyNetwork>;
    getSizeNetwork(): number;
    getOriginalAttribute(net: CyNetwork, mergedAttributeName: string): string;
    getOriginalAttributeByIndex(net: CyNetwork, index: number): string;
    getOriginalAttributeMap(mergedAttributeName: string): Map<CyNetwork, string>;
    getOriginalAttributeMapByIndex(index: number): Map<CyNetwork, string>;
    setOriginalAttribute(net: CyNetwork, attributeName: string, mergedAttributeName: string): string;
    setOriginalAttributeByIndex(net: CyNetwork, attributeName: string, index: number): string;
    removeOriginalAttribute(net: CyNetwork, mergedAttributeName: string): string;
    removeOriginalAttributeByIndex(net: CyNetwork, index: number): string;
    removeMergedAttribute(mergedAttributeName: string): string;
    removeMergedAttributeByIndex(index: number): string;
    addAttributes(mapNetAttributeName: Map<CyNetwork, string>, mergedAttrName: string, index?: number): string;
    addNetwork(net: CyNetwork, cyTable: CyTable): void;
    removeNetwork(net: CyNetwork): void;
}