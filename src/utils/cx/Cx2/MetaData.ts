import { Aspect } from "./Aspect"

export interface MetaData extends Aspect {
  metaData: MetaDataValue[]
}

export interface MetaDataValue {
  name: string
  elementCount?: number
}
