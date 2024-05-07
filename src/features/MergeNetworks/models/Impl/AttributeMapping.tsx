import { IdType } from "../../../../models/IdType";
import { Column, Table } from "../../../../models/TableModel";
import { MatchingTableRow } from "../DataInterfaceForMerge";
import { ColumnType } from "../../utils/ColumnType";

export class AttributeMapping {
    private attributeMapping: Record<IdType, string[]>
    private mergedAttributes: string[]
    private mergedAttributeTypes: ColumnType<any>[]
    private mergedAttributeMutability: boolean[]
    private netTables: Record<IdType, Table>
    private matchingTable: MatchingTableRow[]
    private nullAttr: string = "";

    constructor() {
        this.attributeMapping = {}
        this.mergedAttributes = []
        this.mergedAttributeTypes = []
        this.mergedAttributeMutability = []
    }
    public getTable(id: IdType) {
        return this.netTables[id]
    }
    public getMergedAttributes() {
        return this.mergedAttributes
    }

    public getMergedColumns(): Column[] {
        return this.mergedAttributeTypes.map(colType => {
            const colName = this.getMergedAttribute(this.mergedAttributeTypes.indexOf(colType))
            return {
                name: colName,
                type: colType.name
            } as Column
        })
    }

    public getSizeMergedAttributes() {
        return this.mergedAttributes.length
    }

    public getMergedAttribute(index: number) {
        if (index < 0 || index >= this.mergedAttributes.length) {
            throw new Error("Index out of bounds")
        } else {
            return this.mergedAttributes[index]
        }
    }

    public getMergedAttributeIndex(attribute: string) {
        return this.mergedAttributes.indexOf(attribute)
    }

    public setMergedAttributes(index: number, attributeName: string) {
        if (index < 0 || index >= this.mergedAttributes.length) {
            throw new Error("Index out of bounds")
        } else if (attributeName === null) {
            throw new Error("Attribute name is null")
        } else {
            this.mergedAttributes[index] = attributeName
        }
        this.resetMergedAttributeType(index, false)
        return this.mergedAttributes[index]
    }
    public getMergedAttributeType(indexOrAttribute: number | string): ColumnType<any> {
        if (typeof indexOrAttribute === "number") {
            const index = indexOrAttribute;
            if (index < 0 || index >= this.mergedAttributeTypes.length) {
                throw new Error("Index out of bounds");
            } else {
                return this.mergedAttributeTypes[index];
            }
        } else if (typeof indexOrAttribute === "string") {
            const attribute = indexOrAttribute;
            const index = this.mergedAttributes.indexOf(attribute);
            if (index === -1) {
                throw new Error("Attribute not found");
            }
            return this.getMergedAttributeType(index);
        } else {
            throw new Error("Invalid argument type");
        }
    }

    public setMergedAttributeType(indexOrAttribute: number | string, type: ColumnType<any>) {
        if (typeof indexOrAttribute === "number") {
            const index = indexOrAttribute;
            if (index < 0 || index >= this.mergedAttributeTypes.length) {
                throw new Error("Index out of bounds");
            } else {
                const map = this.getOriginalAttributeMap(index);
                for (const [net, attr] of Object.entries(map)) {
                    const table = this.netTables[net];
                    const oriTypeLst = table.columns.filter(col => col.name === attr);
                    if (oriTypeLst.length !== 1) {
                        throw new Error("Column not found");
                    }
                    const oriType = oriTypeLst[0];
                    if (!ColumnType.isConvertable(new ColumnType(oriType.type), type)) {
                        throw new Error(`Cannot convert from ${oriType.name} to ${type.name}`);
                    }
                }
                this.mergedAttributeTypes[index] = type;
            }
        } else if (typeof indexOrAttribute === "string") {
            const attribute = indexOrAttribute;
            const index = this.mergedAttributes.indexOf(attribute);
            if (index === -1) {
                throw new Error("Attribute not found");
            }
            this.setMergedAttributeType(index, type);
        } else {
            throw new Error("Invalid argument type");
        }
    }

    public getMergedAttributeMutability(indexOrAttribute: number | string): boolean {
        if (typeof indexOrAttribute === "number") {
            const index = indexOrAttribute;
            if (index < 0 || index >= this.mergedAttributeMutability.length) {
                throw new Error("Index out of bounds");
            } else {
                return this.mergedAttributeMutability[index];
            }
        } else if (typeof indexOrAttribute === "string") {
            const attribute = indexOrAttribute;
            const index = this.mergedAttributes.indexOf(attribute);
            if (index === -1) {
                throw new Error("Attribute not found");
            }
            return this.getMergedAttributeMutability(index);
        } else {
            throw new Error("Invalid argument type");
        }
    }

    public setMergedAttributeMutability(indexOrAttribute: number | string, isImmutable: boolean) {
        if (typeof indexOrAttribute === "number") {
            const index = indexOrAttribute;
            if (index < 0 || index >= this.mergedAttributeMutability.length) {
                throw new Error("Index out of bounds");
            } else {
                this.mergedAttributeMutability[index] = isImmutable;
            }
        } else if (typeof indexOrAttribute === "string") {
            const attribute = indexOrAttribute;
            const index = this.mergedAttributes.indexOf(attribute);
            if (index === -1) {
                throw new Error("Attribute not found");
            }
            this.setMergedAttributeMutability(index, isImmutable);
        } else {
            throw new Error("Invalid argument type");
        }
    }

    public containsMergedAttribute(attributeName: string) {
        if (attributeName === null) {
            throw new Error("Column name is null");
        }
        return this.mergedAttributes.includes(attributeName);
    }

    public getOriginalAttribute(net: IdType, mergedAttributeName: string | number): string {
        if (typeof mergedAttributeName === "number") {
            const index = mergedAttributeName;
            if (index >= this.attributeMapping[net].length || index < 0) {
                throw new Error("Index out of bounds");
            }
            const attr = this.attributeMapping[net][index];
            if (attr === null) {
                throw new Error("Network is not selected as merging network");
            }
            return attr;
        } else if (typeof mergedAttributeName === "string") {
            const index = this.mergedAttributes.indexOf(mergedAttributeName);
            if (index === -1) {
                throw new Error(`No ${mergedAttributeName} is contained in merged table columns`);
            }
            return this.getOriginalAttribute(net, index);
        } else {
            throw new Error("Invalid argument type");
        }
    }
    public getOriginalAttributeMap(mergedAttributeName: string | number): Record<IdType, string> {
        if (typeof mergedAttributeName === "number") {
            const index = mergedAttributeName;
            if (index >= this.getSizeMergedAttributes() || index < 0) {
                throw new Error("Index out of bounds");
            }
            const returnMap: Record<IdType, string> = {};
            for (const [net, attrs] of Object.entries(this.attributeMapping)) {
                const attr = attrs[index];
                if (attr !== this.nullAttr) {
                    returnMap[net] = attr;
                }
            }
            return returnMap;
        } else if (typeof mergedAttributeName === "string") {
            const index = this.mergedAttributes.indexOf(mergedAttributeName);
            if (index === -1) {
                throw new Error(`No ${mergedAttributeName} is contained in merged table columns`);
            }
            return this.getOriginalAttributeMap(index);
        } else {
            throw new Error("Invalid argument type");
        }
    }

    public setOriginalAttribute(net: IdType, attributeName: string, mergedAttributeName: string | number): string {
        if (typeof mergedAttributeName === "number") {
            const index = mergedAttributeName;
            if (index >= this.mergedAttributes.length || index < 0) {
                throw new Error("Index out of bounds");
            }
            const attrs = this.attributeMapping[net];
            if (attrs === null) {
                throw new Error("Network is not selected as merging network");
            }
            const old = attrs[index];
            if (old !== attributeName) {
                attrs[index] = attributeName;
                this.resetMergedAttributeType(index, false);
            }
            return old;
        } else if (typeof mergedAttributeName === "string") {
            const index = this.mergedAttributes.indexOf(mergedAttributeName);
            if (index === -1) {
                throw new Error(`No ${mergedAttributeName} is contained in merged table columns`);
            }
            return this.setOriginalAttribute(net, attributeName, index);
        } else {
            throw new Error("Invalid argument type");
        }

    }

    public removeOriginalAttribute(net: IdType, mergedAttributeName: string | number): string {
        if (typeof mergedAttributeName === "number") {
            const index = mergedAttributeName;
            if (index < 0 || index >= this.getSizeMergedAttributes()) {
                throw new Error("Index out of bounds");
            }
            const attrs = this.attributeMapping[net];
            if (attrs === null) {
                throw new Error("Network is not selected as merging network");
            }
            const old = attrs[index];
            if (!this.pack(index)) {
                this.resetMergedAttributeType(index, false);
            }
            return old;
        } else if (typeof mergedAttributeName === "string") {
            const index = this.mergedAttributes.indexOf(mergedAttributeName);
            if (index === -1) {
                throw new Error(`No ${mergedAttributeName} is contained in merged table columns`);
            }
            return this.removeOriginalAttribute(net, index);
        } else {
            throw new Error("Invalid argument type");
        }
    }

    public removeMergedAttribute(mergedAttributeName: string | number): string {
        if (typeof mergedAttributeName === "number") {
            const index = mergedAttributeName;
            if (index < 0 || index >= this.getSizeMergedAttributes()) {
                throw new Error("Index out of bounds");
            }
            for (const attrs of Object.values(this.attributeMapping)) {
                attrs.splice(index, 1);
            }
            this.mergedAttributeTypes.splice(index, 1);
            this.mergedAttributeMutability.splice(index, 1);
            return this.mergedAttributes.splice(index, 1)[0];
        } else if (typeof mergedAttributeName === "string") {
            const index = this.mergedAttributes.indexOf(mergedAttributeName);
            if (index === -1) {
                throw new Error(`No ${mergedAttributeName} is contained in merged table columns`);
            }
            return this.removeMergedAttribute(index);
        } else {
            throw new Error("Invalid argument type");
        }

    }

    public addAttributes(mapNetAttributeName: Record<IdType, string>, mergedAttrName: string, index: number): string {
        if (mapNetAttributeName === null || mergedAttrName === null) {
            throw new Error("Null parameters");
        }
        if (index === null) {
            index = this.getSizeMergedAttributes();
        }
        if (index < 0 || index > this.getSizeMergedAttributes()) {
            throw new Error("Index out of bounds");
        }
        if (Object.keys(mapNetAttributeName).length === 0) {
            throw new Error("Empty map");
        }
        const networkSet = new Set(Object.keys(this.attributeMapping));
        if (!Object.keys(mapNetAttributeName).every(net => networkSet.has(net))) {
            throw new Error("Non-exist network(s)");
        }
        for (const [net, attrs] of Object.entries(this.attributeMapping)) {
            const name = mapNetAttributeName[net];
            if (name !== null) {
                attrs.splice(index, 0, name);
            } else {
                attrs.splice(index, 0, this.nullAttr);
            }
        }
        const defaultName = this.getDefaultMergedAttrName(mergedAttrName);
        this.mergedAttributes.splice(index, 0, defaultName);
        this.resetMergedAttributeType(index, true);
        this.resetMergedAttributeMutability(index, true);
        return defaultName;
    }

    public addNetwork(net: IdType, table: Table) {
        if (net === null || table === null) {
            throw new Error("Null parameters")
        }
        this.netTables[net] = table
        const attributeNames = table.columns.map(col => col.name).filter(col => col !== "SUID" && col !== "selected" && col !== "__Annotations").sort()
        const nAttr = attributeNames.length
        if (Object.keys(this.attributeMapping).length === 0) {
            const attrs: string[] = []
            this.attributeMapping[net] = attrs
            for (let i = 0; i < nAttr; i++) {
                this.addAttributes({ [net]: attributeNames[i] }, attributeNames[i], i)
            }
        } else {
            let attrs = this.attributeMapping[net]
            if (attrs !== null) {
                throw new Error("Network already exists")
            }
            const nr = this.getSizeMergedAttributes()
            attrs = new Array<string>(nr)
            for (let i = 0; i < nr; i++) {
                attrs[i] = this.nullAttr
            }
            this.attributeMapping[net] = attrs
            for (let i = 0; i < nAttr; i++) {
                const at = attributeNames[i]
                let found = false
                for (let ir = 0; ir < nr; ir++) {
                    if (attrs[ir] !== this.nullAttr) {
                        continue
                    }
                    if (this.mergedAttributes[ir] === at) {
                        found = true
                        this.setOriginalAttribute(net, at, ir)
                        break
                    }
                    for (const [net_curr, attr_curr] of Object.entries(this.attributeMapping)) {
                        if (attr_curr[ir] === at) {
                            found = true
                            this.setOriginalAttribute(net, at, ir)
                            break
                        }
                    }
                }
                if (!found) {
                    this.addAttributes({ [net]: at }, at, -1)
                }
            }
        }
    }

    public getNetworkSet() {
        return Object.keys(this.attributeMapping)
    }

    public getSizeNetwork() {
        return Object.keys(this.attributeMapping).length
    }

    public removeNetwork(net: IdType) {
        if (net === null) {
            throw new Error("Network is null")
        }
        const removed = this.attributeMapping[net]
        const n = removed.length
        for (let i = n - 1; i >= 0; i--) {
            if (removed[i] !== this.nullAttr) {
                if (!this.pack(i)) {
                    this.resetMergedAttributeType(i, false)
                    this.resetMergedAttributeMutability(i, false)
                }
            }
        }
    }

    protected pack(index: number): boolean {
        if (index < 0 || index >= this.getSizeMergedAttributes()) {
            throw new Error("Index out of bounds")
        }
        for (const attrs of Object.values(this.attributeMapping)) {
            if (attrs[index] !== this.nullAttr) {
                return false
            }
        }
        this.removeMergedAttribute(index)
        return true;
    }

    private getDefaultMergedAttrName(attr: string): string {
        if (attr === null) {
            throw new Error("Attribute is null")
        }
        let appendix = ""
        let i = 0
        while (true) {
            const attr_ret = attr + appendix
            if (this.mergedAttributes.includes(attr_ret)) {
                appendix = "." + ++i
            } else {
                return attr + appendix
            }
        }
    }

    public addNewAttribute(net: IdType, attributeName: string) {
        if (net === null || attributeName === null) {
            throw new Error("Null parameters")
        }
        const attrs = this.attributeMapping[net]
        if (attrs === null) {
            throw new Error("Network is not selected as merging network")
        }
        attrs.push(attributeName)
        const attrMerged = attributeName
        this.mergedAttributes.push(this.getDefaultMergedAttrName(attrMerged))
        this.resetMergedAttributeType(this.getSizeMergedAttributes(), true)
        this.resetMergedAttributeMutability(this.getSizeMergedAttributes(), true)

    }

    protected resetMergedAttributeType(index: number, add: boolean) {
        if (this.getSizeMergedAttributes() > this.mergedAttributeTypes.length + (add ? 1 : 0)) {
            throw new Error("Column type not complete")
        }

        if (index >= this.getSizeMergedAttributes() || index < 0) {
            throw new Error("Index out of bounds")
        }

        const map = this.getOriginalAttributeMap(index)
        const types = new Set<ColumnType<any>>()
        for (const entry of Object.entries(map)) {
            const table = this.netTables[entry[0]]
            const col = table.columns.filter(col => col.name === entry[1])
            if (col.length !== 1) {
                throw new Error("Column not found")
            }
            types.add(new ColumnType(col[0].type))
        }

        const type = ColumnType.getResonableCompatibleConvertionType(types)

        if (add) {
            this.mergedAttributeTypes.push(type)
        } else {
            const old = this.mergedAttributeTypes[index]
            if (!ColumnType.isConvertable(type, old)) {
                this.mergedAttributeTypes[index] = type
            }
        }
    }

    protected resetMergedAttributeMutability(index: number, add: boolean) {
        if (this.getSizeMergedAttributes() > this.mergedAttributeMutability.length + (add ? 1 : 0)) {
            throw new Error("Column mutability not complete")
        }

        if (index >= this.getSizeMergedAttributes() || index < 0) {
            throw new Error("Index out of bounds")
        }

        const map = this.getOriginalAttributeMap(index)
        let isImmutable = true
        for (const [net, attr] of Object.entries(map)) {
            const table = this.netTables[net]
            const attList = table.columns.filter(att => att.name === attr)
            if (attList.length === 1) { // Todo: there is no definition of immutiability in the Column class
                continue
            }
            isImmutable = false
            break
        }
        if (add) {
            this.mergedAttributeMutability.push(isImmutable)
        } else {
            this.mergedAttributeMutability[index] = isImmutable
        }
    }
}