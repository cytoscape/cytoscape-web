import { ValueType, ValueTypeName } from "../../../models/TableModel";
import { Column } from "../../../models/TableModel/Column";

export class MatchingColumn implements Column {
    name: string;
    type: ValueTypeName;
    isList: boolean;
    listType: ValueTypeName | undefined;

    constructor(name: string, type: ValueTypeName) {
        this.name = name;
        this.type = type;
        if(type.includes('list_of')){
            this.isList = true;
            this.listType = type.replace('list_of_', '') as ValueTypeName;
        }else{
            this.isList = false;
        }
    }

    public isConvertible(toType: ValueTypeName): boolean {
        if(this.type === toType) return true;
        
        const conversionMap: Record<ValueTypeName, ValueTypeName[]> = {
            string: ["number"], 
            number: ["string"], 
            boolean: ["string"], 
        };

        return conversionMap[this.type]?.includes(toType) || this.type === toType;
    }

    public castTo(toType: ValueTypeName, value: ValueType): ValueType {
        if (!this.isConvertible(toType)) {
            throw new Error(`Conversion from ${this.type} to ${toType} is not supported`);
        }

        // Implement casting logic
        switch (toType) {
            case "string":
                return String(value);
            case "number":
                if (typeof value === "string") {
                    const parsed = parseFloat(value);
                    if (isNaN(parsed)) {
                        throw new Error("Cannot convert string to number: invalid string");
                    }
                    return parsed;
                }
                return value;
            case "boolean":
                return Boolean(value);
            default:
                return value; // default case where no conversion is needed
        }
    }
}

//FYI
// import { AttributeName } from './AttributeName'
// import { ValueTypeName } from './ValueTypeName'
// import { ValueType } from './ValueType'

// export interface Column {
//   // Unique column name, e.g. "nodeDegree"
//   readonly name: AttributeName

//   // Type of the column, e.g. "long"
//   readonly type: ValueTypeName
// }

// export type ListOfValueType = string[] | number[] | boolean[]

// export type SingleValueType = string | number | boolean

// export type ValueType = ListOfValueType | SingleValueType


// export const ValueTypeName = {
//     String: 'string',
//     Long: 'long',
//     Integer: 'integer',
//     Double: 'double',
//     Boolean: 'boolean',
//     ListString: 'list_of_string',
//     ListLong: 'list_of_long',
//     ListInteger: 'list_of_integer',
//     ListDouble: 'list_of_double',
//     ListBoolean: 'list_of_boolean',
//   } as const
  
//   export type ValueTypeName = typeof ValueTypeName[keyof typeof ValueTypeName]