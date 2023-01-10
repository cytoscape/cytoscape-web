import { IdType } from '../IdType'
import { GraphObject } from './GraphObject'

export interface Edge extends GraphObject {
  readonly s: IdType // Source node ID
  readonly t: IdType // Target node ID
}
