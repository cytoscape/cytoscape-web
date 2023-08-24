import { IdType } from '../../../../models/IdType'
import NetworkFn, { Network } from '../../../../models/NetworkModel'

export const createTree = (rootNodeId: IdType, dag: Network): void => {
  const children = NetworkFn.getPredecessors(dag, rootNodeId)
  console.log('children', children)
}
