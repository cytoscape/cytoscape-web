import { ValueType } from "../Table/ValueType";

export interface VisualMappingFucntion<T extends ValueType, K> {
  map: (value: T) => K
}