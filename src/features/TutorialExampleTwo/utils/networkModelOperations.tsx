import { v4 as uuidv4 } from 'uuid'
import NetworkFn, { Network, NetworkAttributes } from '../../../models/NetworkModel'
import TableFn, { Column, Table } from '../../../models/TableModel'
import ViewModelFn, { NetworkView } from '../../../models/ViewModel'
import VisualStyleFn, { VisualStyle } from '../../../models/VisualStyleModel'
import { NetworkWithView } from '../../../utils/cx-utils'
import { EdgeView, NodeView } from '../../../models/ViewModel'
import { Attribute } from '../../../models/CxModel/Cx2/CoreAspects/Attribute'
import { VisualPropertyValueType } from '../../../models/VisualStyleModel'
import {
  putNetworkToDb,
  putTablesToDb,
  putVisualStyleToDb,
  putNetworkViewToDb,
  putNetworkSummaryToDb
} from '../../../store/persist/db'
import {
  EdgeVisualPropertyName,
  NodeVisualPropertyName,
} from '../../../models/VisualStyleModel/VisualPropertyName'
import { Visibility } from '../../../models/CxModel/NetworkSummary/Visibility'
import { NdexNetworkSummary } from '../../../models/NetworkSummaryModel'

export const DEFAULT_ATTRIBUTE = "name";

// Function to create an emyty network
export const createEmptyNetworkWithView = async (
  nodeAttrLst: Column[] = [],
  edgeAttrLst: Column[] = [],
  id?: string,
  networkName?: string,
  networkDescription?: string,
): Promise<[NetworkWithView, NdexNetworkSummary]> => {
  // Todo: check if id already exists
  const newNetworkName = networkName ?? "Example Network"
  const newNetworkDescription = networkDescription ?? "This is a demo of creating a 2-node-1-edge network."

  const uuid: string = id !== undefined ? id : uuidv4()
  const network: Network = NetworkFn.createNetwork(uuid)
  const nodeTable: Table = TableFn.createTable(uuid, nodeAttrLst);
  const edgeTable: Table = TableFn.createTable(uuid, edgeAttrLst);

  const visualStyle: VisualStyle = VisualStyleFn.createVisualStyle();// default
  const networkView: NetworkView = ViewModelFn.createEmptyViewModel(uuid)
  const networkAttributes: NetworkAttributes = {
    id: uuid,
    attributes: {},
  }
  const networkSummary = {
    ownerUUID: uuid,
    name: newNetworkName,
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
    properties: [],
    owner: '',
    version: '',
    completed: false,
    visibility: 'PUBLIC' as Visibility,
    nodeCount: 0,
    edgeCount: 0,
    description: newNetworkDescription,
    creationTime: new Date(Date.now()),
    externalId: uuid,
    isDeleted: false,
    modificationTime: new Date(Date.now()),
  }

  // save to Database
  await putNetworkSummaryToDb(networkSummary)
  await putNetworkToDb(network);
  await putTablesToDb(uuid, nodeTable, edgeTable);
  await putVisualStyleToDb(uuid, visualStyle)
  await putNetworkViewToDb(uuid, networkView)

  return [{
    network,
    nodeTable,
    edgeTable,
    visualStyle,
    networkViews: [networkView],
    networkAttributes,
  }, networkSummary];
}


export const createNodeView = ({ nodeId, v, x, y, z }: {
  nodeId: string, v?: Attribute, x?: number, y?: number, z?: number
}): NodeView => {
  const nodeView: NodeView = {
    id: nodeId,
    x: x ?? 0,
    y: y ?? 0,
    values: new Map<NodeVisualPropertyName, VisualPropertyValueType>(),
  };
  return nodeView
}
export const createEdgeView = (edgeId: string): EdgeView => {
  const edgeView: EdgeView = {
    id: edgeId,
    values: new Map<EdgeVisualPropertyName, VisualPropertyValueType>(),
  };
  return edgeView
}
