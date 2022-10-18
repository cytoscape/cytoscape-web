import { IdType } from '../IdType'
import { Node } from './Node'
import { Edge } from './Edge'

/**
 * Minimal graph object interface
 * All functions for the network model are exported as modules
 */
export interface Network {
  id: IdType
  model: any
}

