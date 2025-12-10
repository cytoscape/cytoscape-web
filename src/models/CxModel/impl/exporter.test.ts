import { CyNetwork } from '../../CyNetworkModel'
import { Network } from '../../NetworkModel'
import NetworkFn from '../../NetworkModel'
import { NetworkSummary } from '../../NetworkSummaryModel'
import { createNetworkSummary } from '../../NetworkSummaryModel/impl/networkSummaryImpl'
import { Table } from '../../TableModel'
import { createTable } from '../../TableModel/impl/inMemoryTable'
import { NetworkView } from '../../ViewModel'
import { createViewModel } from '../../ViewModel/impl/viewModelImpl'
import { VisualStyle } from '../../VisualStyleModel'
import VisualStyleFn from '../../VisualStyleModel'
import { Cx2 } from '../Cx2'
import { createCyNetworkFromCx2 } from './converter'
import { exportCyNetworkToCx2 } from './exporter'

// to run these: npx jest src/models/CxModel/impl/exporter.test.ts

describe('exporter', () => {
  describe('exportCyNetworkToCx2', () => {
    it('should export a minimal CyNetwork to CX2 format', () => {
      const networkId = 'test-network-1'
      const network: Network = NetworkFn.createNetwork(networkId)
      const nodeTable = createTable(`${networkId}-nodes`)
      const edgeTable = createTable(`${networkId}-edges`)
      const visualStyle: VisualStyle = VisualStyleFn.createVisualStyle()
      const networkView: NetworkView = createViewModel(network)

      const cyNetwork: CyNetwork = {
        network,
        nodeTable,
        edgeTable,
        visualStyle,
        networkViews: [networkView],
        visualStyleOptions: {
          visualEditorProperties: {
            nodeSizeLocked: false,
            arrowColorMatchesEdge: true,
            tableDisplayConfiguration: {
              nodeTable: {
                columnConfiguration: [],
              },
              edgeTable: {
                columnConfiguration: [],
              },
            },
          },
        },
        opaqueAspects: [],
        filterConfigs: [],
        undoRedoStack: {
          undoStack: [],
          redoStack: [],
        },
      }

      const cx2 = exportCyNetworkToCx2(cyNetwork)

      expect(Array.isArray(cx2)).toBe(true)
      expect(cx2[0]).toHaveProperty('CXVersion')
      expect(cx2[0].CXVersion).toBe('2.0')

      // Check for status
      const statusAspect = cx2.find((aspect: any) =>
        aspect.hasOwnProperty('status'),
      )
      expect(statusAspect).toBeDefined()
      if (statusAspect) {
        expect(statusAspect.status[0].success).toBe(true)
      }
    })

    it('should export a CyNetwork with nodes and edges to CX2 format', () => {
      const networkId = 'test-network-2'

      // Create a simple network with nodes and edges
      const network = NetworkFn.createNetworkFromLists(
        networkId,
        [{ id: '1' }, { id: '2' }, { id: '3' }],
        [
          { id: 'e1', s: '1', t: '2' },
          { id: 'e2', s: '2', t: '3' },
        ],
      )

      const nodeTable = createTable(`${networkId}-nodes`)
      const edgeTable = createTable(`${networkId}-edges`)
      const visualStyle: VisualStyle = VisualStyleFn.createVisualStyle()
      const networkView: NetworkView = createViewModel(network)

      const cyNetwork: CyNetwork = {
        network,
        nodeTable,
        edgeTable,
        visualStyle,
        networkViews: [networkView],
        visualStyleOptions: {
          visualEditorProperties: {
            nodeSizeLocked: false,
            arrowColorMatchesEdge: true,
            tableDisplayConfiguration: {
              nodeTable: {
                columnConfiguration: [],
              },
              edgeTable: {
                columnConfiguration: [],
              },
            },
          },
        },
        opaqueAspects: [],
        filterConfigs: [],
        undoRedoStack: {
          undoStack: [],
          redoStack: [],
        },
      }

      const cx2 = exportCyNetworkToCx2(cyNetwork)

      // Check for nodes aspect
      const nodesAspect = cx2.find((aspect: any) =>
        aspect.hasOwnProperty('nodes'),
      )
      expect(nodesAspect).toBeDefined()
      if (nodesAspect) {
        expect(nodesAspect.nodes).toHaveLength(3)
        expect(nodesAspect.nodes[0]).toHaveProperty('id')
      }

      // Check for edges aspect
      const edgesAspect = cx2.find((aspect: any) =>
        aspect.hasOwnProperty('edges'),
      )
      expect(edgesAspect).toBeDefined()
      if (edgesAspect) {
        expect(edgesAspect.edges).toHaveLength(2)
        expect(edgesAspect.edges[0]).toHaveProperty('id')
        expect(edgesAspect.edges[0]).toHaveProperty('s')
        expect(edgesAspect.edges[0]).toHaveProperty('t')
      }
    })

    it('should export a CyNetwork with network attributes to CX2 format', () => {
      const networkId = 'test-network-3'
      const network: Network = NetworkFn.createNetwork(networkId)
      const nodeTable = createTable(`${networkId}-nodes`)
      const edgeTable = createTable(`${networkId}-edges`)
      const visualStyle: VisualStyle = VisualStyleFn.createVisualStyle()
      const networkView: NetworkView = createViewModel(network)

      const summary: NetworkSummary = createNetworkSummary({
        networkId: network.id,
        name: 'Test Network',
        description: 'A test network',
      })
      summary.version = '1.0'

      const cyNetwork: CyNetwork = {
        network,
        nodeTable,
        edgeTable,
        visualStyle,
        networkViews: [networkView],
        visualStyleOptions: {
          visualEditorProperties: {
            nodeSizeLocked: false,
            arrowColorMatchesEdge: true,
            tableDisplayConfiguration: {
              nodeTable: {
                columnConfiguration: [],
              },
              edgeTable: {
                columnConfiguration: [],
              },
            },
          },
        },
        opaqueAspects: [],
        filterConfigs: [],
        undoRedoStack: {
          undoStack: [],
          redoStack: [],
        },
      }

      const cx2 = exportCyNetworkToCx2(cyNetwork, summary)

      // Check for network attributes from summary
      const networkAttributesAspect = cx2.find((aspect: any) =>
        aspect.hasOwnProperty('networkAttributes'),
      )
      expect(networkAttributesAspect).toBeDefined()
      if (networkAttributesAspect) {
        expect(networkAttributesAspect.networkAttributes[0]).toHaveProperty(
          'name',
        )
        expect(networkAttributesAspect.networkAttributes[0].name).toBe(
          'Test Network',
        )
        expect(networkAttributesAspect.networkAttributes[0].version).toBe('1.0')
        expect(networkAttributesAspect.networkAttributes[0].description).toBe(
          'A test network',
        )
      }
    })

    it('should export a CyNetwork with network name from summary', () => {
      const networkId = 'test-network-4'
      const network: Network = NetworkFn.createNetwork(networkId)
      const nodeTable = createTable(`${networkId}-nodes`)
      const edgeTable = createTable(`${networkId}-edges`)
      const visualStyle: VisualStyle = VisualStyleFn.createVisualStyle()
      const networkView: NetworkView = createViewModel(network)

      const summary: NetworkSummary = createNetworkSummary({
        networkId: network.id,
        name: 'Test Network from Summary',
        description: 'Description from summary',
      })
      summary.version = '2.0'

      const cyNetwork: CyNetwork = {
        network,
        nodeTable,
        edgeTable,
        visualStyle,
        networkViews: [networkView],
        visualStyleOptions: {
          visualEditorProperties: {
            nodeSizeLocked: false,
            arrowColorMatchesEdge: true,
            tableDisplayConfiguration: {
              nodeTable: {
                columnConfiguration: [],
              },
              edgeTable: {
                columnConfiguration: [],
              },
            },
          },
        },
        opaqueAspects: [],
        filterConfigs: [],
        undoRedoStack: {
          undoStack: [],
          redoStack: [],
        },
      }

      const cx2 = exportCyNetworkToCx2(cyNetwork, summary)

      // Check for network attributes
      const networkAttributesAspect = cx2.find((aspect: any) =>
        aspect.hasOwnProperty('networkAttributes'),
      )
      expect(networkAttributesAspect).toBeDefined()
      if (networkAttributesAspect) {
        expect(networkAttributesAspect.networkAttributes[0].name).toBe(
          'Test Network from Summary',
        )
        expect(networkAttributesAspect.networkAttributes[0].description).toBe(
          'Description from summary',
        )
        expect(networkAttributesAspect.networkAttributes[0].version).toBe('2.0')
      }
    })

    it('should export a CyNetwork with visual editor properties', () => {
      const networkId = 'test-network-5'
      const network: Network = NetworkFn.createNetwork(networkId)
      const nodeTable = createTable(`${networkId}-nodes`)
      const edgeTable = createTable(`${networkId}-edges`)
      const visualStyle: VisualStyle = VisualStyleFn.createVisualStyle()
      const networkView: NetworkView = createViewModel(network)

      const cyNetwork: CyNetwork = {
        network,
        nodeTable,
        edgeTable,
        visualStyle,
        networkViews: [networkView],
        visualStyleOptions: {
          visualEditorProperties: {
            nodeSizeLocked: true,
            arrowColorMatchesEdge: false,
            tableDisplayConfiguration: {
              nodeTable: {
                columnConfiguration: [{ attributeName: 'name', visible: true }],
              },
              edgeTable: {
                columnConfiguration: [
                  { attributeName: 'weight', visible: true },
                ],
              },
            },
          },
        },
        opaqueAspects: [],
        filterConfigs: [],
        undoRedoStack: {
          undoStack: [],
          redoStack: [],
        },
      }

      const cx2 = exportCyNetworkToCx2(cyNetwork)

      // Check for visual editor properties
      const visualEditorPropertiesAspect = cx2.find((aspect: any) =>
        aspect.hasOwnProperty('visualEditorProperties'),
      )
      expect(visualEditorPropertiesAspect).toBeDefined()
      if (visualEditorPropertiesAspect) {
        expect(
          visualEditorPropertiesAspect.visualEditorProperties[0].properties
            .nodeSizeLocked,
        ).toBe(true)
        expect(
          visualEditorPropertiesAspect.visualEditorProperties[0].properties
            .arrowColorMatchesEdge,
        ).toBe(false)
      }
    })

    it('should export a CyNetwork with optional aspects', () => {
      const networkId = 'test-network-6'
      const network: Network = NetworkFn.createNetwork(networkId)
      const nodeTable = createTable(`${networkId}-nodes`)
      const edgeTable = createTable(`${networkId}-edges`)
      const visualStyle: VisualStyle = VisualStyleFn.createVisualStyle()
      const networkView: NetworkView = createViewModel(network)

      const cyNetwork: CyNetwork = {
        network,
        nodeTable,
        edgeTable,
        visualStyle,
        networkViews: [networkView],
        visualStyleOptions: {
          visualEditorProperties: {
            nodeSizeLocked: false,
            arrowColorMatchesEdge: true,
            tableDisplayConfiguration: {
              nodeTable: {
                columnConfiguration: [],
              },
              edgeTable: {
                columnConfiguration: [],
              },
            },
          },
        },
        opaqueAspects: [
          {
            customAspect: [{ data: 'value' }],
          },
        ],
        filterConfigs: [],
        undoRedoStack: {
          undoStack: [],
          redoStack: [],
        },
      }

      const cx2 = exportCyNetworkToCx2(cyNetwork)

      // Check for custom aspect
      const customAspect = cx2.find((aspect: any) =>
        aspect.hasOwnProperty('customAspect'),
      )
      expect(customAspect).toBeDefined()
      if (customAspect) {
        expect(customAspect.customAspect[0].data).toBe('value')
      }
    })

    it('should export a CyNetwork with node positions from network view', () => {
      const networkId = 'test-network-7'
      const network = NetworkFn.createNetworkFromLists(
        networkId,
        [{ id: '1' }, { id: '2' }],
        [{ id: 'e1', s: '1', t: '2' }],
      )

      const nodeTable = createTable(`${networkId}-nodes`)
      const edgeTable = createTable(`${networkId}-edges`)
      const visualStyle: VisualStyle = VisualStyleFn.createVisualStyle()
      const networkView: NetworkView = createViewModel(network)

      // Set node positions
      networkView.nodeViews['1'].x = 10
      networkView.nodeViews['1'].y = 20
      networkView.nodeViews['2'].x = 30
      networkView.nodeViews['2'].y = 40

      const cyNetwork: CyNetwork = {
        network,
        nodeTable,
        edgeTable,
        visualStyle,
        networkViews: [networkView],
        visualStyleOptions: {
          visualEditorProperties: {
            nodeSizeLocked: false,
            arrowColorMatchesEdge: true,
            tableDisplayConfiguration: {
              nodeTable: {
                columnConfiguration: [],
              },
              edgeTable: {
                columnConfiguration: [],
              },
            },
          },
        },
        opaqueAspects: [],
        filterConfigs: [],
        undoRedoStack: {
          undoStack: [],
          redoStack: [],
        },
      }

      const cx2 = exportCyNetworkToCx2(cyNetwork)

      // Check for nodes with positions
      const nodesAspect = cx2.find((aspect: any) =>
        aspect.hasOwnProperty('nodes'),
      )
      expect(nodesAspect).toBeDefined()
      if (nodesAspect) {
        const node1 = nodesAspect.nodes.find((n: any) => n.id === 1)
        expect(node1).toBeDefined()
        if (node1) {
          expect(node1.x).toBe(10)
          expect(node1.y).toBe(20)
        }
        const node2 = nodesAspect.nodes.find((n: any) => n.id === 2)
        expect(node2).toBeDefined()
        if (node2) {
          expect(node2.x).toBe(30)
          expect(node2.y).toBe(40)
        }
      }
    })

    it('should export a CyNetwork with attribute declarations', () => {
      const networkId = 'test-network-8'
      const network = NetworkFn.createNetworkFromLists(
        networkId,
        [{ id: '1' }, { id: '2' }],
        [{ id: 'e1', s: '1', t: '2' }],
      )

      const nodeTable = createTable(`${networkId}-nodes`)
      const edgeTable = createTable(`${networkId}-edges`)

      // Add columns to tables
      nodeTable.columns.push({
        name: 'name',
        type: 'string',
      })
      nodeTable.columns.push({
        name: 'score',
        type: 'double',
      })

      edgeTable.columns.push({
        name: 'weight',
        type: 'double',
      })

      const visualStyle: VisualStyle = VisualStyleFn.createVisualStyle()
      const networkView: NetworkView = createViewModel(network)

      const cyNetwork: CyNetwork = {
        network,
        nodeTable,
        edgeTable,
        visualStyle,
        networkViews: [networkView],
        visualStyleOptions: {
          visualEditorProperties: {
            nodeSizeLocked: false,
            arrowColorMatchesEdge: true,
            tableDisplayConfiguration: {
              nodeTable: {
                columnConfiguration: [],
              },
              edgeTable: {
                columnConfiguration: [],
              },
            },
          },
        },
        opaqueAspects: [],
        filterConfigs: [],
        undoRedoStack: {
          undoStack: [],
          redoStack: [],
        },
      }

      const cx2 = exportCyNetworkToCx2(cyNetwork)

      // Check for attribute declarations
      const attributeDeclarationsAspect = cx2.find((aspect: any) =>
        aspect.hasOwnProperty('attributeDeclarations'),
      )
      expect(attributeDeclarationsAspect).toBeDefined()
      if (attributeDeclarationsAspect) {
        expect(
          attributeDeclarationsAspect.attributeDeclarations[0].nodes,
        ).toHaveProperty('name')
        expect(
          attributeDeclarationsAspect.attributeDeclarations[0].nodes,
        ).toHaveProperty('score')
        expect(
          attributeDeclarationsAspect.attributeDeclarations[0].edges,
        ).toHaveProperty('weight')
      }
    })

    it('should round-trip a CyNetwork through CX2 format', () => {
      const networkId = 'test-network-roundtrip'
      const originalCx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          metaData: [
            { name: 'nodes', elementCount: 2 },
            { name: 'edges', elementCount: 1 },
            { name: 'networkAttributes', elementCount: 1 },
          ],
        },
        {
          attributeDeclarations: [
            {
              nodes: {
                name: { d: 'string' },
                score: { d: 'double' },
              },
              edges: {
                weight: { d: 'double' },
              },
              networkAttributes: {
                name: { d: 'string' },
              },
            },
          ],
        },
        {
          networkAttributes: [
            {
              name: 'Roundtrip Test Network',
              version: '1.0',
            },
          ],
        },
        {
          nodes: [
            {
              id: 1,
              x: 10,
              y: 20,
              v: {
                name: 'Node1',
                score: 0.5,
              },
            },
            {
              id: 2,
              x: 30,
              y: 40,
              v: {
                name: 'Node2',
                score: 0.8,
              },
            },
          ],
        },
        {
          edges: [
            {
              id: 1,
              s: 1,
              t: 2,
              v: {
                weight: 0.7,
              },
            },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      // Convert to CyNetwork
      const cyNetwork = createCyNetworkFromCx2(networkId, originalCx2)

      // Export back to CX2
      const exportedCx2 = exportCyNetworkToCx2(cyNetwork)

      // Verify basic structure
      expect(exportedCx2[0]).toHaveProperty('CXVersion')
      expect(exportedCx2[0].CXVersion).toBe('2.0')

      // Verify nodes exist
      const nodesAspect = exportedCx2.find((aspect: any) =>
        aspect.hasOwnProperty('nodes'),
      )
      expect(nodesAspect).toBeDefined()
      if (nodesAspect) {
        expect(nodesAspect.nodes).toHaveLength(2)
      }

      // Verify edges exist
      const edgesAspect = exportedCx2.find((aspect: any) =>
        aspect.hasOwnProperty('edges'),
      )
      expect(edgesAspect).toBeDefined()
      if (edgesAspect) {
        expect(edgesAspect.edges).toHaveLength(1)
      }

      // Network attributes are only exported if a summary is provided
      // Without a summary, network attributes from the original CX2 are not available
      // This is expected behavior - network attributes are now stored in NetworkSummary
    })

    it('should use networkName parameter to override network name', () => {
      const networkId = 'test-network-name-override'
      const network: Network = NetworkFn.createNetwork(networkId)
      const nodeTable = createTable(`${networkId}-nodes`)
      const edgeTable = createTable(`${networkId}-edges`)
      const visualStyle: VisualStyle = VisualStyleFn.createVisualStyle()
      const networkView: NetworkView = createViewModel(network)

      const summary: NetworkSummary = createNetworkSummary({
        networkId: network.id,
        name: 'Summary Name',
      })

      const cyNetwork: CyNetwork = {
        network,
        nodeTable,
        edgeTable,
        visualStyle,
        networkViews: [networkView],
        visualStyleOptions: {
          visualEditorProperties: {
            nodeSizeLocked: false,
            arrowColorMatchesEdge: true,
            tableDisplayConfiguration: {
              nodeTable: {
                columnConfiguration: [],
              },
              edgeTable: {
                columnConfiguration: [],
              },
            },
          },
        },
        opaqueAspects: [],
        filterConfigs: [],
        undoRedoStack: {
          undoStack: [],
          redoStack: [],
        },
      }

      const cx2 = exportCyNetworkToCx2(cyNetwork, summary, 'Override Name')

      // Check that override name is used
      const networkAttributesAspect = cx2.find((aspect: any) =>
        aspect.hasOwnProperty('networkAttributes'),
      )
      expect(networkAttributesAspect).toBeDefined()
      if (networkAttributesAspect) {
        expect(networkAttributesAspect.networkAttributes[0].name).toBe(
          'Override Name',
        )
      }
    })
  })
})
