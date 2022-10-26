import { IdType } from '../IdType'

/**
 * Nodes and edges. Everything should have an workspace-unique ID.
 */
export interface GraphObject {
  readonly id: IdType
}
