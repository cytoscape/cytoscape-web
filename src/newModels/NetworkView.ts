// import { VisualStyle } from './Style'
// import { Network } from './Network'
// import { Node } from './Network/Node'
// import { Edge } from './Network/Edge'
// import { IdType } from './IdType'
// export interface Position {
//   x: number
//   y: number
//   z?: number
// }

// export type VisualPropertyName =
//   | 'color'
//   | 'width'
//   | 'opacity'
//   | 'label'
//   | 'labelColor'
//   | 'labelSize'
//   | 'labelOpacity'

// export type NodeVisualPropertyName =
//   | VisualPropertyName
//   | 'shape'
//   | 'height'
//   | 'position'

// export type EdgeVisualPropertyName = VisualPropertyName | 'lineType'

// export interface VisualProperty<T> {
//   name: NodeVisualPropertyName | EdgeVisualPropertyName
//   value: T
// }

// export interface View {
//   readonly key: IdType // Associated model ID (e.g. Node ID)
//   visualProperties: VisualProperty<unknown>[]
// }

// export interface NetworkView {
//   nodeViews: View[]
//   edgeViews: View[]
// }

// /**
//  * Apply given visual style to the network view
//  *
//  * @param view
//  * @param style
//  */
// export const apply = (view: NetworkView, style: VisualStyle): void => {
//   const nvs: View[] = view.nodeViews
//   const evs: View[] = view.edgeViews

//   nvs.forEach((nodeView) => {
//     // Compute actual values here
//   })
//   evs.forEach((edgeView) => {
//     // Compute actual values here
//   })
// }

// export const applyLayout = (
//   view: NetworkView,
//   positions: { key: IdType; position: Position },
// ): void => {
//   view.nodeViews.forEach((nodeView: View) => {
//     // Set position here
//   })
// }

// export class NetworkViewFactory {
//   public static createNetworkView(
//     network: Network,
//     style?: VisualStyle,
//   ): NetworkView {
//     const nodeViews: View[] = network
//       .getNodes()
//       .map((node: Node) => createNodeView(node))
//     const edgeViews: View[] = network
//       .getEdges()
//       .map((edge: Edge) => createEdgeView(edge))

//     const view: NetworkView = {
//       nodeViews,
//       edgeViews,
//     }
//     return view
//   }
// }

// /**
//  * Create an empty view for the given node
//  *
//  * @param node
//  * @returns
//  */
// const createNodeView = (node: Node): View => {
//   const position: Position = {
//     x: 0,
//     y: 0,
//   }

//   return {
//     key: node.id,
//     visualProperties: [
//       {
//         name: 'position',
//         value: position,
//       },
//     ],
//   }
// }

// const createEdgeView = (edge: Edge): View => {
//   return {
//     key: edge.id,
//     visualProperties: [],
//   }
// }
