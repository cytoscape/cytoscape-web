import { ValueTypeName } from "../../../models/TableModel";
import { Column } from "../../../models/TableModel/Column";


export class MatchingColumn implements Column {
    name: string;
    type: ValueTypeName;

    constructor(name: string, type: ValueTypeName) {
        this.name = name;
        this.type = type;
    }

    public isConvertable(toType: MatchingColumn): boolean {
        if (this.type === toType.type) {
            return true;
        }

        return false
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
