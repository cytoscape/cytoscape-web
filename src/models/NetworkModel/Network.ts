import type { IdType } from '../IdType'
import type { Edge } from './Edge'
import type { Node } from './Node'

/**
 * Minimal graph object interface
 * Will be used as a wrapper for the external graph implementation
 */
export interface Network {
  readonly id: IdType
  readonly nodes: Node[]
  readonly edges: Edge[]
}
