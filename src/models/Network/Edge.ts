import { GraphObject } from "./GraphObject"

export interface Edge extends GraphObject {
  s: BigInt // Source node ID
  t: BigInt // Target node ID
  type: string // Edge type ("interaction" in Cytoscape desktop)
}

