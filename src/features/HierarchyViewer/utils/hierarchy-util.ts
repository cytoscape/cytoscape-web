import { HierarchyNode } from 'd3-hierarchy'
import {
  NdexNetworkProperty,
  NdexNetworkSummary,
  Visibility,
} from '../../../models/NetworkSummaryModel'
import { Table, ValueType } from '../../../models/TableModel'
import { D3TreeNode } from '../components/CustomLayout/D3TreeNode'
import { HcxMetaData } from '../model/HcxMetaData'
import { HcxMetaTag } from '../model/HcxMetaTag'
import { IdType } from '../../../models/IdType'
import { NodeView } from '../../../models/ViewModel'
import { CirclePackingView } from '../model/CirclePackingView'

export const getHcxProps = (
  summaryObject: Record<string, any>,
): HcxMetaData | undefined => {
  const keys: string[] = Object.keys(summaryObject)

  if (keys.length === 0) {
    // in the future, hcx will have more validation/error handling
    return undefined
  }

  if (keys.includes(HcxMetaTag.interactionNetworkUUID)) {
    // This is a hierarchy data with link to an interaction network
    const hcxMetaData: HcxMetaData = {
      interactionNetworkHost: summaryObject[HcxMetaTag.interactionNetworkHost],
      interactionNetworkUUID: summaryObject[HcxMetaTag.interactionNetworkUUID],
      modelFileCount: summaryObject[HcxMetaTag.modelFileCount],
    }

    return hcxMetaData
  }

  return undefined
}

export const createDummySummary = (
  uuid: string,
  name: string,
  nodeCount: number,
  edgeCount: number,
): NdexNetworkSummary => {
  const time: Date = new Date(Date.now())
  const summary: NdexNetworkSummary = {
    isNdex: false,
    ownerUUID: '',
    isReadOnly: false,
    subnetworkIds: [],
    isValid: true,
    warnings: [],
    isShowcase: false,
    isCertified: false,
    indexLevel: 'NONE',
    hasLayout: true,
    hasSample: false,
    cxFileSize: 0,
    cx2FileSize: 0,
    name,
    properties: [],
    owner: '',
    version: '',
    completed: false,
    visibility: Visibility.PRIVATE,
    nodeCount,
    edgeCount,
    description: '',
    creationTime: time,
    externalId: uuid,
    isDeleted: false,
    modificationTime: time,
  }
  return summary
}

export const isHCX = (summary: NdexNetworkSummary): boolean => {
  if (summary === undefined) {
    return false
  }

  if (summary.properties === undefined || summary.properties.length === 0) {
    return false
  }

  const networkPropObj: Record<string, ValueType> = summary.properties.reduce<{
    [key: string]: ValueType
  }>((acc, prop) => {
    acc[prop.predicateString] = prop.value
    return acc
  }, {})
  const metadata: HcxMetaData | undefined = getHcxProps(networkPropObj)

  return metadata !== undefined
}

const findAllDescendants = (
  root: HierarchyNode<D3TreeNode>,
  targetNodeId: string,
): string[] => {
  let queue: HierarchyNode<D3TreeNode>[] = [root]
  // Find the target node

  let targetNode: HierarchyNode<D3TreeNode> | undefined
  while (queue.length > 0) {
    const node = queue.shift()
    if (node === undefined) {
      continue
    }
    if (node.data.id === targetNodeId) {
      targetNode = node
      break
    }
    if (node.children) {
      const children = node.children as HierarchyNode<D3TreeNode>[]
      queue.push(...children)
    }
  }
  // Collect all descendants' IDs
  queue = [targetNode as HierarchyNode<D3TreeNode>]
  const descendants: string[] = []
  while (queue.length > 0) {
    const node = queue.shift()
    if (node === undefined) {
      continue
    }
    descendants.push(node.data.id)
    if (node.children) {
      const children = node.children as HierarchyNode<D3TreeNode>[]
      queue.push(...children)
    }
  }
  return descendants
}

const SCALING_FACTOR = 40

export const applyCpLayout = (
  cpViewModel: CirclePackingView,
  subsystemNodeId: string,
  interactionNetworkId: IdType,
  interactionNetworkTable: Table,
  nodeViews: Record<string, NodeView>,
): Map<IdType, [number, number]> => {
  // ID format is parentID-node name
  // const cpViewModel = getCpViewModel()
  if (cpViewModel === undefined) {
    return new Map()
  }

  const { hierarchy } = cpViewModel
  if (hierarchy === undefined) {
    return new Map()
  }

  const allDescendants: string[] = findAllDescendants(
    hierarchy,
    subsystemNodeId,
  )

  // Filter to get only the leaf nodes
  const leavesInCircle = allDescendants.filter(
    (nodeId: string) => nodeId.split('-').length > 1,
  )

  const cpNodeViews = cpViewModel.nodeViews
  const { rows } = interactionNetworkTable

  const id2name: Map<IdType, string> = new Map()
  Object.keys(nodeViews).forEach((nodeId: string) => {
    const row = rows.get(nodeId)
    if (row === undefined) {
      return
    }
    const nodeName: string = row.name as string

    // Find the name with prefix
    leavesInCircle.find((cpNodeId: string) => {
      const parts: string[] = cpNodeId.split('-')
      if (parts[1] === nodeName || `${parts[1]}-${parts[2]}` === nodeName) {
        id2name.set(nodeId, cpNodeId)
      } else {
        // Accept new suffix for duplicate subsystem nodes, which are -1d, -2d, etc.
        const pattern = /^-?\d+d?$/
        if (pattern.test(parts[1])) {
          if (parts[2] === nodeName || `${parts[2]}-${parts[3]}` === nodeName) {
            id2name.set(nodeId, cpNodeId)
          }
        }
      }
    })
  })

  const positionMap: Map<IdType, [number, number]> = new Map()
  id2name.forEach((nodeName: string, nodeId: string) => {
    const cpNodeView = cpNodeViews[nodeName]
    if (cpNodeView === undefined) {
      return
    } else {
      positionMap.set(nodeId, [
        cpNodeView.x * SCALING_FACTOR,
        cpNodeView.y * SCALING_FACTOR,
      ])
    }
  })

  return positionMap
}

/**
 * Check if the current network is a hierarchy or not
 * based on the network summary
 *
 * @param summary - network summary
 *
 * @returns HCX metadata if the network is a hierarchy, otherwise undefined
 *
 */
export const getHcxMetadata = (
  summary: NdexNetworkSummary,
): HcxMetaData | undefined => {
  if (summary === undefined) {
    return undefined
  }
  const networkProps: NdexNetworkProperty[] = summary.properties
  if (networkProps === undefined || networkProps.length === 0) {
    return undefined
  }

  const networkPropObj: Record<string, ValueType> = networkProps.reduce<{
    [key: string]: ValueType
  }>((acc, prop) => {
    acc[prop.predicateString] = prop.value
    return acc
  }, {})
  const metadata: HcxMetaData | undefined = getHcxProps(networkPropObj)

  if (metadata !== undefined) {
    return metadata
  } else {
    return undefined
  }
}
