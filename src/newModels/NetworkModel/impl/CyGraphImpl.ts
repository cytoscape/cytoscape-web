import { IdType } from '../../IdType'
import TableFn, { AttributeName, Row, Table, ValueType } from '../../TableModel'
import { Network, Node, Edge, NetworkAttributes } from '..'

import { Core } from 'cytoscape'
import * as cytoscape from 'cytoscape'

const GroupType = { Nodes: 'nodes', Edges: 'edges' } as const
type GroupType = typeof GroupType[keyof typeof GroupType]

/**
 * Private class actually implements graph object using
 * Cytoscape.js
 */
class CyGraph implements Network {
  readonly id: IdType

  // Data Tables
  private readonly _nodeTable: Table
  private readonly _edgeTable: Table

  // Network properties as a Record
  private readonly _netAttributes: NetworkAttributes

  constructor(id: IdType) {
    this.id = id
    this._store = createCyDataStore()
    this._nodeTable = TableFn.createTable(id)
    this._edgeTable = TableFn.createTable(id)
    this._netAttributes = { id, attributes: {} }
  }

  // Graph storage, using Cytoscape
  // Only topioogy is stored here, attributes are stored in the table
  private readonly _store: Core

  get nodeTable(): Table {
    return this._nodeTable
  }

  get edgeTable(): Table {
    return this._edgeTable
  }

  get netAttributes(): NetworkAttributes {
    return this._netAttributes
  }

  get store(): Core {
    return this._store
  }
}

export const nodes = (network: Network): Node[] => {
  const cyGraph = network as CyGraph
  const store = cyGraph.store
  return store.nodes().map((node) => ({
    id: node.id(),
  }))
}

/**
 *
 * @returns Initialize Cytoscape
 */
const createCyDataStore = (): Core =>
  cytoscape({
    headless: true,
  })

// Public API
export const createNetwork = (id: IdType): Network => new CyGraph(id)

const newCyNode = (nodeId: IdType) => {
  return {
    group: GroupType.Nodes,
    data: { id: nodeId },
  }
}
export const addNode = (
  network: Network,
  newNodeId: IdType,
  row?: Record<AttributeName, ValueType>,
): Network => {
  const cyGraph = network as CyGraph
  const store = cyGraph.store
  const nodeTable = cyGraph.nodeTable
  const node = newCyNode(newNodeId)
  store.add(node)
  if (row) {
    // TableFn.addRow(nodeTable, row)
  }
  return network
}

export const addNodes = (
  network: Network,
  nodes:
    | [Node, Record<AttributeName, ValueType>?]
    | [Node, Record<AttributeName, ValueType>?][],
): Network => {
  const cyGraph = network as CyGraph
  const nodeTable = cyGraph.nodeTable
  const store = cyGraph.store

  if (!Array.isArray(nodes)) {
    // Add single node
    const nodeId = (nodes[0] as Node).id
    store.add(newCyNode(nodeId))

    const row: Record<AttributeName, ValueType> = nodes[1]
    if (row) {
      TableFn.insertRow(nodeTable, row, nodeId)
    }
  } else {
    // store.add(nodes.map((node: Node) => newNode(node.id)))
  }

  return network
}
