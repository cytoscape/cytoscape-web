import cloneDeep from 'lodash/cloneDeep'

import { putNetworkSummaryToDb } from '../../../../db'
import { CyNetwork } from '../../../../models/CyNetworkModel'
import { IdType } from '../../../../models/IdType'
import { NetworkAttributes } from '../../../../models/NetworkModel'
import { NetworkSummary } from '../../../../models/NetworkSummaryModel'
import { Visibility } from '../../../../models/NetworkSummaryModel/Visibility'
import { Column } from '../../../../models/TableModel/Column'
import ViewModelFn, { NetworkView } from '../../../../models/ViewModel'
import VisualStyleFn, { VisualStyle } from '../../../../models/VisualStyleModel'
import { checkAttribute } from '../../utils/attributesOperationsUtil'
import { MergeType, NetworkRecord } from '../DataInterfaceForMerge'
import { MatchingTable } from '../MatchingTable'
import { differenceMerge } from './DifferenceMerge'
import { intersectionMerge } from './IntersectionMerge'
import { mergeNetSummary } from './MergeNetSummary'
import { unionMerge } from './UnionMerge'

export const createMergedNetworkWithView = async (
  fromNetworks: IdType[],
  toNetworkId: IdType,
  networkName: string,
  networkRecords: Record<IdType, NetworkRecord>,
  nodeAttributeMapping: MatchingTable,
  edgeAttributeMapping: MatchingTable,
  networkAttributeMapping: MatchingTable,
  matchingAttribute: Record<IdType, Column>,
  netSummaries: Record<IdType, NetworkSummary>,
  mergeOpType: MergeType = MergeType.union,
  mergeWithinNetwork: boolean = false,
  mergeOnlyNodes: boolean = false,
  strictRemoveMode: boolean = false,
): Promise<[CyNetwork, NetworkSummary]> => {
  if (
    checkAttribute(
      nodeAttributeMapping,
      edgeAttributeMapping,
      networkRecords,
      fromNetworks,
    )
  ) {
    throw new Error(`Attribute not found in the network`)
  }
  let mergedNetwork: NetworkRecord = {} as NetworkRecord
  if (mergeOpType === MergeType.union) {
    mergedNetwork = unionMerge(
      fromNetworks,
      toNetworkId,
      networkRecords,
      nodeAttributeMapping,
      edgeAttributeMapping,
      matchingAttribute,
      mergeWithinNetwork,
    )
  } else if (mergeOpType === MergeType.intersection) {
    mergedNetwork = intersectionMerge(
      fromNetworks,
      toNetworkId,
      networkRecords,
      nodeAttributeMapping,
      edgeAttributeMapping,
      matchingAttribute,
      mergeWithinNetwork,
      mergeOnlyNodes,
    )
  } else {
    mergedNetwork = differenceMerge(
      fromNetworks,
      toNetworkId,
      networkRecords,
      nodeAttributeMapping,
      edgeAttributeMapping,
      matchingAttribute,
      mergeWithinNetwork,
      mergeOnlyNodes,
      strictRemoveMode,
    )
  }
  const mergedNetSummary = mergeNetSummary(
    fromNetworks,
    networkAttributeMapping,
    netSummaries,
  )

  // Todo: merge network attributes also
  const networkAttributes: NetworkAttributes = {
    id: toNetworkId,
    attributes: {},
  }

  const newNetwork = mergedNetwork.network
  const newNodeTable = mergedNetwork.nodeTable
  const newEdgeTable = mergedNetwork.edgeTable

  // Initialize new visual style and network view model
  const baseVisualStyle = networkRecords[fromNetworks[0]].visualStyle
  const newVisualStyle: VisualStyle = baseVisualStyle
    ? cloneDeep(baseVisualStyle)
    : VisualStyleFn.createVisualStyle()
  const newNetworkView: NetworkView = ViewModelFn.createViewModel(newNetwork)

  const networkSummary: NetworkSummary = {
    isNdex: false,
    ownerUUID: toNetworkId,
    name: networkName,
    isReadOnly: false,
    subnetworkIds: [],
    isValid: false,
    warnings: [],
    isShowcase: false,
    isCertified: false,
    indexLevel: '',
    hasLayout: false,
    hasSample: false,
    cxFileSize: 0,
    cx2FileSize: 0,
    properties: mergedNetSummary.flattenedProperties,
    owner: '',
    version: mergedNetSummary.mergedVersion,
    completed: false,
    visibility: Visibility.LOCAL,
    nodeCount: newNetwork.nodes.length,
    edgeCount: newNetwork.edges.length,
    description: mergedNetSummary.mergedDescription,
    creationTime: new Date(Date.now()),
    externalId: toNetworkId,
    isDeleted: false,
    modificationTime: new Date(Date.now()),
  }
  await putNetworkSummaryToDb(networkSummary)

  const undoRedoStack = {
    undoStack: [],
    redoStack: [],
  }

  // Create default visualStyleOptions for merged network
  const nodeTableColumnConfig = newNodeTable.columns.map((c) => ({
    attributeName: c.name,
    visible: true,
  }))
  const edgeTableColumnConfig = newEdgeTable.columns.map((c) => ({
    attributeName: c.name,
    visible: true,
  }))
  const visualStyleOptions = {
    visualEditorProperties: {
      nodeSizeLocked: false,
      arrowColorMatchesEdge: false,
      tableDisplayConfiguration: {
        nodeTable: {
          columnConfiguration: nodeTableColumnConfig,
        },
        edgeTable: {
          columnConfiguration: edgeTableColumnConfig,
        },
      },
    },
  }

  return [
    {
      network: newNetwork,
      nodeTable: newNodeTable,
      edgeTable: newEdgeTable,
      visualStyle: newVisualStyle,
      networkViews: [newNetworkView],
      networkAttributes,
      undoRedoStack,
      visualStyleOptions,
    },
    networkSummary,
  ]
}
