import {
  putNetworkToDb,
  putTablesToDb,
  putVisualStyleToDb,
  putNetworkViewToDb,
  putNetworkSummaryToDb
} from '../../../store/persist/db'
import { v4 as uuidv4 } from 'uuid'
import { NetworkWithView } from '../../../utils/cx-utils'
import { EdgeView, NodeView } from '../../../models/ViewModel'
import TableFn, { Column, Table } from '../../../models/TableModel'
import ViewModelFn, { NetworkView } from '../../../models/ViewModel'
import { NdexNetworkSummary } from '../../../models/NetworkSummaryModel'
import { VisualPropertyValueType } from '../../../models/VisualStyleModel'
import { Attribute } from '../../../models/CxModel/Cx2/CoreAspects/Attribute'
import VisualStyleFn, { VisualStyle } from '../../../models/VisualStyleModel'
import { Visibility } from '../../../models/CxModel/NetworkSummary/Visibility'
import NetworkFn, { Network, NetworkAttributes } from '../../../models/NetworkModel'
import {
  EdgeVisualPropertyName,
  NodeVisualPropertyName
} from '../../../models/VisualStyleModel/VisualPropertyName'

// define constant
export const DEFAULT_ATTRIBUTE = "name";

/**
 * createEmptyNetworkWithView function:
 * This function create an empty network with default attributes
 *
 * Props:
 * - nodeAttrLst: Attributes list of the node table
 * - edgeAttrLst: Attributes list of the edge table
 * - id: uuid of the new network <optional>
 * - networkName: Name of the new network  <optional>
 * - networkDescription: Description of the new network <optional>
 * 
 * Returns:
 * - NetworkWithView: A collection of important properties in a network:
 *     ____________________________________________________________________________________________________________
 *    |      Network       | The Network topology                                                                  |
 *    | Network attributes | The Network attributes                                                                |
 *    |     Node table     | A 2-D array where each column represents an attribute and each row represents a node  |
 *    |     Edge table     | A 2-D array where each column represents an attribute and each row represents an edge |                    
 *    |    Visual style    | A map of visual property names to visual properties                                   |
 *    |    Network views   | The key-value pair storing what should be displayed in the actual visualizations      |
 *    |____________________________________________________________________________________________________________|
 * 
 * - NetworkSummary: Summary of the new network
 */
export const createEmptyNetworkWithView = async (
  nodeAttrLst: Column[] = [],
  edgeAttrLst: Column[] = [],
  id?: string,
  networkName?: string,
  networkDescription?: string,
): Promise<[NetworkWithView, NdexNetworkSummary]> => {
  // Default network details if not specified
  const uuid: string = id !== undefined ? id : uuidv4()
  const newNetworkName = networkName ?? "Example Network"
  const newNetworkDescription = networkDescription ?? "This is a demo of creating a 2-node-1-edge network."

  // Create network, node table, edge table, visual style, network view, newtork attributes and network summary
  const network: Network = NetworkFn.createNetwork(uuid)
  const nodeTable: Table = TableFn.createTable(uuid, nodeAttrLst);
  const edgeTable: Table = TableFn.createTable(uuid, edgeAttrLst);
  const visualStyle: VisualStyle = VisualStyleFn.createVisualStyle();
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

  // Save the above information to the database 
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

/**
 * createEdgeView function:
 * This function create a node view with default or specified attributes
 * Props:
 * - nodeId: Node Id
 * - x: x coordinate
 * - y: y coordinate
 * Returns:
 * - nodeView: A View Model that determines how the node should be displayed
 */
export const createNodeView = ({ nodeId, x, y }: {
  nodeId: string, x?: number, y?: number
}): NodeView => {
  const nodeView: NodeView = {
    id: nodeId,
    x: x ?? 0,
    y: y ?? 0,
    values: new Map<NodeVisualPropertyName, VisualPropertyValueType>(),
  };
  return nodeView
}

/**
 * createNodeView function:
 * This function create a edge view with default or specified attributes
 * Props:
 * - edgeId: Edge Id
 * - values: A map of visual properties of the edge
 * Returns:
 * - edgeView: A View Model that determines how the edge should be displayed
 */
export const createEdgeView = (edgeId: string): EdgeView => {
  const edgeView: EdgeView = {
    id: edgeId,
    values: new Map<EdgeVisualPropertyName, VisualPropertyValueType>(),
  };
  return edgeView
}
