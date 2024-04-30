import { IdType } from "../../../models/IdType";
import { ValueType } from "../../../models/TableModel";

export function valueMatcher(graphObj: Node | Edge, nodeValueMap: Map<IdType, ValueType>): string {
    for (const [key, value] of nodeValueMap) {
        if (graphObj.id === value) {
            return value;
        }
    }

    return ""
}