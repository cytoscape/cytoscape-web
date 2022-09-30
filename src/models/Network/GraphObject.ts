import { Row } from "../Table/Row"

export interface GraphObject {
  readonly id: BigInt

  // Returns all attribute values associated with this node/edge
  getAttributes: () => Row
}
