import { IdType } from "../IdType"
import { GraphObject } from "./GraphObject"

export interface Edge extends GraphObject {
  s: IdType // Source node ID
  t: IdType // Target node ID
}