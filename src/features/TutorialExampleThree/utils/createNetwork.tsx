// import NetworkFn, { Network, NetworkAttributes, Edge } from '../../../models/NetworkModel'
// import { translateCXEdgeId , 
//         translateEdgeIdToCX } from '../../../models/NetworkModel/impl/CyNetwork'
// import { Node as CxNode } from '../../../models/CxModel/Cx2/CoreAspects/Node'
// import { Edge as CxEdge } from '../../../models/CxModel/Cx2/CoreAspects/Edge'
// import TableFn, { Column,Table } from '../../../models/TableModel'
// import ViewModelFn, { NetworkView } from '../../../models/ViewModel'
// import VisualStyleFn, { VisualStyle } from '../../../models/VisualStyleModel'
// import { AttributeName } from '../../../models/TableModel/AttributeName'
// import { ValueType } from '../../../models/TableModel/ValueType'
// import { getCachedData } from '../../../utils/cx-utils'
// import { v4 as uuidv4 } from 'uuid'
// import { Attribute } from '../../../models/CxModel/Cx2/CoreAspects/Attribute'
// import { NetworkModel } from '../../TutorialExampleTwo/utils/networkModelOperations'
// import {
//     putNetworkToDb,
//     putTablesToDb,
//     putVisualStyleToDb,
//     putNetworkViewToDb,
//     putNetworkSummaryToDb,
// } from '../../../store/persist/db'

// export const extractSubnetworkFromSelection= async (
//     id?: string,
//     nodeAttrLst:Column[]=[],
//     edgeAttrLst:Column[]=[]
//   ): Promise<NetworkModel> => {

//     const currNetworkId = 
//     // check if id already exists
//     const newNetworkNodeCount = 0;
//     const newNetworkEdgeCount = 0;
//     const newNetworkName = "Extracted Subnetwork"
//     const newNetworkDescription = "This is a subnetwork extracted from the selected nodes and edges in a existing network."

//     const uuid: string = id !== undefined ? id : uuidv4()
//     const network: Network = NetworkFn.createNetwork(uuid)
//     const nodeTable:Table = TableFn.createTable(uuid, nodeAttrLst);
//     const edgeTable:Table = TableFn.createTable(uuid, edgeAttrLst);
  
//     const visualStyle: VisualStyle = VisualStyleFn.createVisualStyle();// default
//     const networkView: NetworkView = ViewModelFn.createEmptyViewModel(uuid)
//     const networkAttributes: NetworkAttributes = {
//       id: uuid,
//       attributes: {},
//     }
    
//     // save to Database
//     await putNetworkSummaryToDb({
//         ownerUUID: uuid,
//         name: newNetworkName,
//         isReadOnly: false,
//         subnetworkIds: [],
//         isValid: false,
//         warnings: [],
//         isShowcase: false,
//         isCertified: false,
//         indexLevel: '',
//         hasLayout: false,
//         hasSample: false,
//         cxFileSize: 0,
//         cx2FileSize: 0,
//         properties: [],
//         owner: '',
//         version: '',
//         completed: false,
//         visibility: 'PUBLIC',
//         nodeCount: newNetworkNodeCount,
//         edgeCount: newNetworkEdgeCount,
//         description: newNetworkDescription,
//         creationTime: new Date(Date.now()),
//         externalId: uuid,
//         isDeleted: false,
//         modificationTime: new Date(Date.now()),
//         maxNodeId: 0,
//         maxEdgeId: 0
//       })
//     await putNetworkToDb(network);
//     await putTablesToDb(uuid, nodeTable, edgeTable);
//     await putVisualStyleToDb(uuid, visualStyle)
//     await putNetworkViewToDb(uuid, networkView)

//     return {
//       network,
//       nodeTable,
//       edgeTable,
//       visualStyle,
//       networkViews: [networkView],
//       networkAttributes,
//     }
// }