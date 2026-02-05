import { CyNetwork } from '../../CyNetworkModel'
import { Network } from '../../NetworkModel'
import NetworkFn from '../../NetworkModel'
import { NetworkAttributes } from '../../NetworkModel'
import { NetworkSummary } from '../../NetworkSummaryModel'
import { createNetworkSummary } from '../../NetworkSummaryModel/impl/networkSummaryImpl'
import { Table } from '../../TableModel'
import { createTable } from '../../TableModel/impl/inMemoryTable'
import { NetworkView } from '../../ViewModel'
import { createViewModel } from '../../ViewModel/impl/viewModelImpl'
import { VisualStyle } from '../../VisualStyleModel'
import VisualStyleFn from '../../VisualStyleModel'
import { CustomGraphicsType } from '../../VisualStyleModel/VisualPropertyValue'
import { PassthroughMappingFunction } from '../../VisualStyleModel/VisualMappingFunction'
import { MappingFunctionType } from '../../VisualStyleModel/VisualMappingFunction'
import { VisualPropertyValueTypeName } from '../../VisualStyleModel/VisualPropertyValueTypeName'
import {
  setDefault,
  setMapping,
  setBypass,
} from '../../VisualStyleModel/impl/visualStyleImpl'
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
      const networkAttributes: NetworkAttributes = {
        id: networkId,
        attributes: {},
      }

      const cyNetwork: CyNetwork = {
        network,
        nodeTable,
        edgeTable,
        visualStyle,
        networkViews: [networkView],
        networkAttributes,
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
      const networkAttributes: NetworkAttributes = {
        id: networkId,
        attributes: {},
      }

      const cyNetwork: CyNetwork = {
        network,
        nodeTable,
        edgeTable,
        visualStyle,
        networkViews: [networkView],
        networkAttributes,
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
      const networkAttributes: NetworkAttributes = {
        id: networkId,
        attributes: {
          name: 'Test Network',
          version: '1.0',
          description: 'A test network',
        },
      }

      const cyNetwork: CyNetwork = {
        network,
        nodeTable,
        edgeTable,
        visualStyle,
        networkViews: [networkView],
        networkAttributes,
        undoRedoStack: {
          undoStack: [],
          redoStack: [],
        },
      }

      const cx2 = exportCyNetworkToCx2(cyNetwork)

      // Check for network attributes
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
      const networkAttributes: NetworkAttributes = {
        id: networkId,
        attributes: {},
      }

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
        networkAttributes,
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
      const networkAttributes: NetworkAttributes = {
        id: networkId,
        attributes: {},
      }

      const cyNetwork: CyNetwork = {
        network,
        nodeTable,
        edgeTable,
        visualStyle,
        networkViews: [networkView],
        networkAttributes,
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
      const networkAttributes: NetworkAttributes = {
        id: networkId,
        attributes: {},
      }

      const cyNetwork: CyNetwork = {
        network,
        nodeTable,
        edgeTable,
        visualStyle,
        networkViews: [networkView],
        networkAttributes,
        otherAspects: [
          {
            customAspect: [{ data: 'value' }],
          },
        ],
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

      const networkAttributes: NetworkAttributes = {
        id: networkId,
        attributes: {},
      }

      const cyNetwork: CyNetwork = {
        network,
        nodeTable,
        edgeTable,
        visualStyle,
        networkViews: [networkView],
        networkAttributes,
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
      const networkAttributes: NetworkAttributes = {
        id: networkId,
        attributes: {},
      }

      const cyNetwork: CyNetwork = {
        network,
        nodeTable,
        edgeTable,
        visualStyle,
        networkViews: [networkView],
        networkAttributes,
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

      // Verify network attributes exist
      const networkAttributesAspect = exportedCx2.find((aspect: any) =>
        aspect.hasOwnProperty('networkAttributes'),
      )
      expect(networkAttributesAspect).toBeDefined()
      if (networkAttributesAspect) {
        expect(networkAttributesAspect.networkAttributes[0]).toHaveProperty(
          'name',
        )
      }
    })

    it('should use networkName parameter to override network name', () => {
      const networkId = 'test-network-name-override'
      const network: Network = NetworkFn.createNetwork(networkId)
      const nodeTable = createTable(`${networkId}-nodes`)
      const edgeTable = createTable(`${networkId}-edges`)
      const visualStyle: VisualStyle = VisualStyleFn.createVisualStyle()
      const networkView: NetworkView = createViewModel(network)
      const networkAttributes: NetworkAttributes = {
        id: networkId,
        attributes: {
          name: 'Original Name',
        },
      }

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
        networkAttributes,
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

    describe('custom graphics export', () => {
      it('should exclude custom graphics with DEFAULT_CUSTOM_GRAPHICS from defaults', () => {
        const networkId = 'test-network-custom-graphics-default'
        const network: Network = NetworkFn.createNetwork(networkId)
        const nodeTable = createTable(`${networkId}-nodes`)
        const edgeTable = createTable(`${networkId}-edges`)
        const visualStyle: VisualStyle = VisualStyleFn.createVisualStyle()
        const networkView: NetworkView = createViewModel(network)
        const networkAttributes: NetworkAttributes = {
          id: networkId,
          attributes: {},
        }

        const cyNetwork: CyNetwork = {
          network,
          nodeTable,
          edgeTable,
          visualStyle,
          networkViews: [networkView],
          networkAttributes,
          undoRedoStack: {
            undoStack: [],
            redoStack: [],
          },
        }

        const cx2 = exportCyNetworkToCx2(cyNetwork)

        // Check visual properties defaults
        const visualPropertiesAspect = cx2.find((aspect: any) =>
          aspect.hasOwnProperty('visualProperties'),
        )
        expect(visualPropertiesAspect).toBeDefined()
        if (visualPropertiesAspect) {
          const nodeDefaults =
            visualPropertiesAspect.visualProperties[0].default.node
          // Custom graphics with DEFAULT_CUSTOM_GRAPHICS should not be in defaults
          expect(nodeDefaults).not.toHaveProperty('NODE_CUSTOMGRAPHICS_1')
        }
      })

      it('should include custom graphics with pie chart in defaults', () => {
        const networkId = 'test-network-custom-graphics-pie'
        const network: Network = NetworkFn.createNetwork(networkId)
        const nodeTable = createTable(`${networkId}-nodes`)
        const edgeTable = createTable(`${networkId}-edges`)
        let visualStyle: VisualStyle = VisualStyleFn.createVisualStyle()
        const networkView: NetworkView = createViewModel(network)
        const networkAttributes: NetworkAttributes = {
          id: networkId,
          attributes: {},
        }

        // Set a pie chart as default for nodeImageChart1
        const pieChart: CustomGraphicsType = {
          type: 'chart',
          name: 'org.cytoscape.PieChart',
          properties: {
            cy_range: [0, 100],
            cy_colorScheme: 'test',
            cy_startAngle: 0,
            cy_colors: ['#FF0000', '#00FF00'],
            cy_dataColumns: ['col1', 'col2'],
          },
        }

        visualStyle = setDefault(visualStyle, 'nodeImageChart1', pieChart)

        const cyNetwork: CyNetwork = {
          network,
          nodeTable,
          edgeTable,
          visualStyle,
          networkViews: [networkView],
          networkAttributes,
          undoRedoStack: {
            undoStack: [],
            redoStack: [],
          },
        }

        const cx2 = exportCyNetworkToCx2(cyNetwork)

        // Check visual properties defaults
        const visualPropertiesAspect = cx2.find((aspect: any) =>
          aspect.hasOwnProperty('visualProperties'),
        )
        expect(visualPropertiesAspect).toBeDefined()
        if (visualPropertiesAspect) {
          const nodeDefaults =
            visualPropertiesAspect.visualProperties[0].default.node
          // Custom graphics with pie chart should be in defaults
          expect(nodeDefaults).toHaveProperty('NODE_CUSTOMGRAPHICS_1')
          // Size and position should also be included
          expect(nodeDefaults).toHaveProperty('NODE_CUSTOMGRAPHICS_SIZE_1')
          expect(nodeDefaults).toHaveProperty('NODE_CUSTOMGRAPHICS_POSITION_1')
        }
      })

      it('should include custom graphics with mappings in mappings', () => {
        const networkId = 'test-network-custom-graphics-mapping'
        const network: Network = NetworkFn.createNetwork(networkId)
        const nodeTable = createTable(`${networkId}-nodes`)
        const edgeTable = createTable(`${networkId}-edges`)
        let visualStyle: VisualStyle = VisualStyleFn.createVisualStyle()
        const networkView: NetworkView = createViewModel(network)
        const networkAttributes: NetworkAttributes = {
          id: networkId,
          attributes: {},
        }

        // Set a mapping for nodeImageChart1
        const mapping: PassthroughMappingFunction = {
          type: MappingFunctionType.Passthrough,
          attribute: 'chartType',
          visualPropertyType: VisualPropertyValueTypeName.CustomGraphic,
          defaultValue: {
            type: 'none',
            name: 'none',
            properties: {},
          },
        }

        visualStyle = setMapping(visualStyle, 'nodeImageChart1', mapping)

        const cyNetwork: CyNetwork = {
          network,
          nodeTable,
          edgeTable,
          visualStyle,
          networkViews: [networkView],
          networkAttributes,
          undoRedoStack: {
            undoStack: [],
            redoStack: [],
          },
        }

        const cx2 = exportCyNetworkToCx2(cyNetwork)

        // Check visual properties mappings
        const visualPropertiesAspect = cx2.find((aspect: any) =>
          aspect.hasOwnProperty('visualProperties'),
        )
        expect(visualPropertiesAspect).toBeDefined()
        if (visualPropertiesAspect) {
          const nodeMappings =
            visualPropertiesAspect.visualProperties[0].nodeMapping
          // Custom graphics with mapping should be in mappings
          expect(nodeMappings).toHaveProperty('NODE_CUSTOMGRAPHICS_1')
          // Size and position should also be included
          expect(nodeMappings).toHaveProperty('NODE_CUSTOMGRAPHICS_SIZE_1')
          expect(nodeMappings).toHaveProperty('NODE_CUSTOMGRAPHICS_POSITION_1')
        }
      })

      it('should include custom graphics with bypasses in bypasses', () => {
        const networkId = 'test-network-custom-graphics-bypass'
        const network = NetworkFn.createNetworkFromLists(
          networkId,
          [{ id: '1' }, { id: '2' }],
          [],
        )
        const nodeTable = createTable(`${networkId}-nodes`)
        const edgeTable = createTable(`${networkId}-edges`)
        let visualStyle: VisualStyle = VisualStyleFn.createVisualStyle()
        const networkView: NetworkView = createViewModel(network)
        const networkAttributes: NetworkAttributes = {
          id: networkId,
          attributes: {},
        }

        // Set a bypass for nodeImageChart1
        const pieChart: CustomGraphicsType = {
          type: 'chart',
          name: 'org.cytoscape.PieChart',
          properties: {
            cy_range: [0, 100],
            cy_colorScheme: 'test',
            cy_startAngle: 0,
            cy_colors: ['#FF0000'],
            cy_dataColumns: ['col1'],
          },
        }

        visualStyle = setBypass(visualStyle, 'nodeImageChart1', ['1'], pieChart)

        const cyNetwork: CyNetwork = {
          network,
          nodeTable,
          edgeTable,
          visualStyle,
          networkViews: [networkView],
          networkAttributes,
          undoRedoStack: {
            undoStack: [],
            redoStack: [],
          },
        }

        const cx2 = exportCyNetworkToCx2(cyNetwork)

        // Check node bypasses
        const nodeBypassesAspect = cx2.find((aspect: any) =>
          aspect.hasOwnProperty('nodeBypasses'),
        )
        expect(nodeBypassesAspect).toBeDefined()
        if (nodeBypassesAspect) {
          expect(nodeBypassesAspect.nodeBypasses.length).toBeGreaterThan(0)
          const node1Bypass = nodeBypassesAspect.nodeBypasses.find(
            (b: any) => b.id === 1,
          )
          expect(node1Bypass).toBeDefined()
          if (node1Bypass) {
            // Custom graphics with bypass should be in bypasses
            expect(node1Bypass.v).toHaveProperty('NODE_CUSTOMGRAPHICS_1')
            // Size and position should also be included
            expect(node1Bypass.v).toHaveProperty('NODE_CUSTOMGRAPHICS_SIZE_1')
            expect(node1Bypass.v).toHaveProperty(
              'NODE_CUSTOMGRAPHICS_POSITION_1',
            )
          }
        }
      })

      it('should exclude custom graphics without defaults, mappings, or bypasses', () => {
        const networkId = 'test-network-custom-graphics-exclude'
        const network: Network = NetworkFn.createNetwork(networkId)
        const nodeTable = createTable(`${networkId}-nodes`)
        const edgeTable = createTable(`${networkId}-edges`)
        const visualStyle: VisualStyle = VisualStyleFn.createVisualStyle()
        const networkView: NetworkView = createViewModel(network)
        const networkAttributes: NetworkAttributes = {
          id: networkId,
          attributes: {},
        }

        // Visual style has default custom graphics (DEFAULT_CUSTOM_GRAPHICS)
        // which should be excluded from export

        const cyNetwork: CyNetwork = {
          network,
          nodeTable,
          edgeTable,
          visualStyle,
          networkViews: [networkView],
          networkAttributes,
          undoRedoStack: {
            undoStack: [],
            redoStack: [],
          },
        }

        const cx2 = exportCyNetworkToCx2(cyNetwork)

        // Check visual properties defaults
        const visualPropertiesAspect = cx2.find((aspect: any) =>
          aspect.hasOwnProperty('visualProperties'),
        )
        expect(visualPropertiesAspect).toBeDefined()
        if (visualPropertiesAspect) {
          const nodeDefaults =
            visualPropertiesAspect.visualProperties[0].default.node
          // Custom graphics with only DEFAULT_CUSTOM_GRAPHICS should not be exported
          expect(nodeDefaults).not.toHaveProperty('NODE_CUSTOMGRAPHICS_1')
          expect(nodeDefaults).not.toHaveProperty('NODE_CUSTOMGRAPHICS_SIZE_1')
          expect(nodeDefaults).not.toHaveProperty(
            'NODE_CUSTOMGRAPHICS_POSITION_1',
          )
        }
      })

      it('should handle multiple custom graphics slots correctly', () => {
        const networkId = 'test-network-custom-graphics-multiple'
        const network: Network = NetworkFn.createNetwork(networkId)
        const nodeTable = createTable(`${networkId}-nodes`)
        const edgeTable = createTable(`${networkId}-edges`)
        let visualStyle: VisualStyle = VisualStyleFn.createVisualStyle()
        const networkView: NetworkView = createViewModel(network)
        const networkAttributes: NetworkAttributes = {
          id: networkId,
          attributes: {},
        }

        // Set pie chart for slot 1 (should be included)
        const pieChart: CustomGraphicsType = {
          type: 'chart',
          name: 'org.cytoscape.PieChart',
          properties: {
            cy_range: [0, 100],
            cy_colorScheme: 'test',
            cy_startAngle: 0,
            cy_colors: ['#FF0000'],
            cy_dataColumns: ['col1'],
          },
        }
        visualStyle = setDefault(visualStyle, 'nodeImageChart1', pieChart)

        // Slot 2 has DEFAULT_CUSTOM_GRAPHICS (should be excluded)
        // Slot 3 has no mapping/bypass (should be excluded)

        const cyNetwork: CyNetwork = {
          network,
          nodeTable,
          edgeTable,
          visualStyle,
          networkViews: [networkView],
          networkAttributes,
          undoRedoStack: {
            undoStack: [],
            redoStack: [],
          },
        }

        const cx2 = exportCyNetworkToCx2(cyNetwork)

        // Check visual properties defaults
        const visualPropertiesAspect = cx2.find((aspect: any) =>
          aspect.hasOwnProperty('visualProperties'),
        )
        expect(visualPropertiesAspect).toBeDefined()
        if (visualPropertiesAspect) {
          const nodeDefaults =
            visualPropertiesAspect.visualProperties[0].default.node
          // Only slot 1 should be included
          expect(nodeDefaults).toHaveProperty('NODE_CUSTOMGRAPHICS_1')
          expect(nodeDefaults).toHaveProperty('NODE_CUSTOMGRAPHICS_SIZE_1')
          expect(nodeDefaults).toHaveProperty('NODE_CUSTOMGRAPHICS_POSITION_1')
          // Slot 2 should not be included (DEFAULT_CUSTOM_GRAPHICS)
          expect(nodeDefaults).not.toHaveProperty('NODE_CUSTOMGRAPHICS_2')
        }
      })
    })
  })
})
