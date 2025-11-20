import { IdType } from '../IdType'
import { Edge,Node } from '.'

/**
 * Minimal graph object interface
 * Will be used as a wrapper for the external graph implementation
 */
export interface Network {
  readonly id: IdType
  readonly nodes: Node[]
  readonly edges: Edge[]
}
