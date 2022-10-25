import { Network } from "../../newModels/NetworkModel"
import * as NetFn from "../../newModels/NetworkModel/impl/network-functions"
import { Cx2 } from "./Cx2"
import * as cxUtil from "./cx2-util"
import { Node as CxNode } from "./Cx2/CoreAspects/Node"

export const createNetworkFromCx = (cx: Cx2): Network => {

  // 1. Extract ID from CX
  // const id = cxUtil.getId(cx)

  const network: Network = NetFn.createNetwork('')
  const cxNodes: CxNode[] = cxUtil.getNodes(cx)

  return {
    id: 'sample',
  }

}
