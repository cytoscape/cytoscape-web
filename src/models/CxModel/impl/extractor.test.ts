import { Cx2 } from '../Cx2'
import {
  getNodes,
  getEdges,
  getNetworkAttributes,
  getAttributeDeclarations,
  getNodeAttributes,
  getEdgeAttributes,
  getVisualProperties,
  getNodeBypasses,
  getEdgeBypasses,
  getVisualEditorProperties,
  getOptionalAspects,
} from './extractor'
import { CoreAspectTag } from '../Cx2/CoreAspectTag'

// to run these: npx jest src/models/CxModel/impl/extractor.test.ts

describe('extractor', () => {
  // Helper function to create a minimal valid CX2 document
  const createMinimalValidCx = (): Cx2 => [
    {
      CXVersion: '2.0',
    },
    {
      status: [
        {
          success: true,
        },
      ],
    },
  ]

  describe('getNodes', () => {
    it('should extract nodes from CX2', () => {
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          nodes: [
            { id: 1 },
            { id: 2 },
            { id: 3 },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const nodes = getNodes(cx2)
      expect(nodes).toHaveLength(3)
      expect(nodes[0].id).toBe(1)
      expect(nodes[1].id).toBe(2)
      expect(nodes[2].id).toBe(3)
    })

    it('should return empty array when nodes aspect is missing', () => {
      const cx2 = createMinimalValidCx()
      const nodes = getNodes(cx2)
      expect(nodes).toEqual([])
    })

    it('should return empty array when nodes aspect is empty', () => {
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          nodes: [],
        },
        {
          status: [{ success: true }],
        },
      ]

      const nodes = getNodes(cx2)
      expect(nodes).toEqual([])
    })
  })

  describe('getEdges', () => {
    it('should extract edges from CX2', () => {
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          edges: [
            { id: 1, s: 1, t: 2 },
            { id: 2, s: 2, t: 3 },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const edges = getEdges(cx2)
      expect(edges).toHaveLength(2)
      expect(edges[0].id).toBe(1)
      expect(edges[0].s).toBe(1)
      expect(edges[0].t).toBe(2)
    })

    it('should return empty array when edges aspect is missing', () => {
      const cx2 = createMinimalValidCx()
      const edges = getEdges(cx2)
      expect(edges).toEqual([])
    })

    it('should return empty array when edges aspect is empty', () => {
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          edges: [],
        },
        {
          status: [{ success: true }],
        },
      ]

      const edges = getEdges(cx2)
      expect(edges).toEqual([])
    })
  })

  describe('getNetworkAttributes', () => {
    it('should extract network attributes from CX2', () => {
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          networkAttributes: [
            {
              name: 'Test Network',
              version: '1.0',
              description: 'A test network',
            },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const networkAttributes = getNetworkAttributes(cx2)
      expect(networkAttributes).toHaveLength(1)
      expect(networkAttributes[0].name).toBe('Test Network')
      expect(networkAttributes[0].version).toBe('1.0')
    })

    it('should return empty array when networkAttributes aspect is missing', () => {
      const cx2 = createMinimalValidCx()
      const networkAttributes = getNetworkAttributes(cx2)
      expect(networkAttributes).toEqual([])
    })

    it('should return empty array when networkAttributes aspect is empty', () => {
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          networkAttributes: [],
        },
        {
          status: [{ success: true }],
        },
      ]

      const networkAttributes = getNetworkAttributes(cx2)
      expect(networkAttributes).toEqual([])
    })
  })

  describe('getAttributeDeclarations', () => {
    it('should extract attribute declarations from CX2', () => {
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
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
              networkAttributes: {},
            },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const attributeDeclarations = getAttributeDeclarations(cx2)
      expect(attributeDeclarations.attributeDeclarations).toHaveLength(1)
      expect(attributeDeclarations.attributeDeclarations[0].nodes).toEqual({
        name: { d: 'string' },
        score: { d: 'double' },
      })
      expect(attributeDeclarations.attributeDeclarations[0].edges).toEqual({
        weight: { d: 'double' },
      })
    })

    it('should return default empty attribute declarations when aspect is missing', () => {
      const cx2 = createMinimalValidCx()
      const attributeDeclarations = getAttributeDeclarations(cx2)
      expect(attributeDeclarations.attributeDeclarations).toHaveLength(1)
      expect(attributeDeclarations.attributeDeclarations[0].nodes).toEqual({})
      expect(attributeDeclarations.attributeDeclarations[0].edges).toEqual({})
      expect(attributeDeclarations.attributeDeclarations[0].networkAttributes).toEqual({})
    })
  })

  describe('getNodeAttributes', () => {
    it('should extract node attributes from CX2', () => {
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          nodes: [
            {
              id: 1,
              v: {
                name: 'Node1',
                score: 0.5,
              },
            },
            {
              id: 2,
              v: {
                name: 'Node2',
                score: 0.8,
              },
            },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const nodeAttributes = getNodeAttributes(cx2)
      expect(nodeAttributes.size).toBe(2)
      expect(nodeAttributes.get('1')).toEqual({
        name: 'Node1',
        score: 0.5,
      })
      expect(nodeAttributes.get('2')).toEqual({
        name: 'Node2',
        score: 0.8,
      })
    })

    it('should return empty map when nodes have no attributes', () => {
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          nodes: [
            { id: 1 },
            { id: 2 },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const nodeAttributes = getNodeAttributes(cx2)
      expect(nodeAttributes.size).toBe(0)
    })

    it('should return empty map when nodes aspect is missing', () => {
      const cx2 = createMinimalValidCx()
      const nodeAttributes = getNodeAttributes(cx2)
      expect(nodeAttributes.size).toBe(0)
    })
  })

  describe('getEdgeAttributes', () => {
    it('should extract edge attributes from CX2', () => {
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          edges: [
            {
              id: 1,
              s: 1,
              t: 2,
              v: {
                weight: 0.5,
                interaction: 'activates',
              },
            },
            {
              id: 2,
              s: 2,
              t: 3,
              v: {
                weight: 0.8,
                interaction: 'inhibits',
              },
            },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const edgeAttributes = getEdgeAttributes(cx2)
      expect(edgeAttributes.size).toBe(2)
      expect(edgeAttributes.get('1')).toEqual({
        weight: 0.5,
        interaction: 'activates',
      })
      expect(edgeAttributes.get('2')).toEqual({
        weight: 0.8,
        interaction: 'inhibits',
      })
    })

    it('should return empty map when edges have no attributes', () => {
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          edges: [
            { id: 1, s: 1, t: 2 },
            { id: 2, s: 2, t: 3 },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const edgeAttributes = getEdgeAttributes(cx2)
      expect(edgeAttributes.size).toBe(0)
    })

    it('should return empty map when edges aspect is missing', () => {
      const cx2 = createMinimalValidCx()
      const edgeAttributes = getEdgeAttributes(cx2)
      expect(edgeAttributes.size).toBe(0)
    })
  })

  describe('getVisualProperties', () => {
    it('should extract visual properties from CX2', () => {
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          visualProperties: [
            {
              default: {
                node: {
                  NODE_SIZE: 50,
                  NODE_FILL_COLOR: '#FF0000',
                },
                edge: {
                  EDGE_WIDTH: 2,
                },
                network: {},
              },
              nodeMapping: {},
              edgeMapping: {},
            },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const visualProperties = getVisualProperties(cx2)
      expect(visualProperties.visualProperties).toHaveLength(1)
      expect(visualProperties.visualProperties[0].default).toEqual({
        node: {
          NODE_SIZE: 50,
          NODE_FILL_COLOR: '#FF0000',
        },
        edge: {
          EDGE_WIDTH: 2,
        },
        network: {},
      })
    })

    it('should return default empty visual properties when aspect is missing', () => {
      const cx2 = createMinimalValidCx()
      const visualProperties = getVisualProperties(cx2)
      expect(visualProperties.visualProperties).toEqual([])
    })
  })

  describe('getNodeBypasses', () => {
    it('should extract node bypasses from CX2', () => {
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          nodeBypasses: [
            {
              id: 1,
              v: {
                NODE_SIZE: 100,
                NODE_FILL_COLOR: '#00FF00',
              },
            },
            {
              id: 2,
              v: {
                NODE_SIZE: 75,
              },
            },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const nodeBypasses = getNodeBypasses(cx2)
      expect(nodeBypasses.nodeBypasses).toHaveLength(2)
      expect(nodeBypasses.nodeBypasses[0].id).toBe(1)
      expect(nodeBypasses.nodeBypasses[0].v).toEqual({
        NODE_SIZE: 100,
        NODE_FILL_COLOR: '#00FF00',
      })
    })

    it('should return default empty node bypasses when aspect is missing', () => {
      const cx2 = createMinimalValidCx()
      const nodeBypasses = getNodeBypasses(cx2)
      expect(nodeBypasses.nodeBypasses).toEqual([])
    })
  })

  describe('getEdgeBypasses', () => {
    it('should extract edge bypasses from CX2', () => {
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          edgeBypasses: [
            {
              id: 1,
              v: {
                EDGE_WIDTH: 5,
                EDGE_COLOR: '#0000FF',
              },
            },
            {
              id: 2,
              v: {
                EDGE_WIDTH: 3,
              },
            },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const edgeBypasses = getEdgeBypasses(cx2)
      expect(edgeBypasses.edgeBypasses).toHaveLength(2)
      expect(edgeBypasses.edgeBypasses[0].id).toBe(1)
      expect(edgeBypasses.edgeBypasses[0].v).toEqual({
        EDGE_WIDTH: 5,
        EDGE_COLOR: '#0000FF',
      })
    })

    it('should return default empty edge bypasses when aspect is missing', () => {
      const cx2 = createMinimalValidCx()
      const edgeBypasses = getEdgeBypasses(cx2)
      expect(edgeBypasses.edgeBypasses).toEqual([])
    })
  })

  describe('getVisualEditorProperties', () => {
    it('should extract visual editor properties from CX2', () => {
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
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
              networkAttributes: {},
            },
          ],
        },
        {
          visualEditorProperties: [
            {
              properties: {
                nodeSizeLocked: true,
                arrowColorMatchesEdge: false,
                tableDisplayConfiguration: {
                  nodeTable: {
                    columnConfiguration: [
                      { attributeName: 'name', visible: true },
                      { attributeName: 'score', visible: false },
                    ],
                  },
                  edgeTable: {
                    columnConfiguration: [
                      { attributeName: 'weight', visible: true },
                    ],
                  },
                },
              },
            },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const visualEditorProperties = getVisualEditorProperties(cx2)
      expect(visualEditorProperties.visualEditorProperties.nodeSizeLocked).toBe(true)
      expect(visualEditorProperties.visualEditorProperties.arrowColorMatchesEdge).toBe(false)
      expect(visualEditorProperties.visualEditorProperties.tableDisplayConfiguration.nodeTable.columnConfiguration).toHaveLength(2)
    })

    it('should return default visual editor properties when aspect is missing', () => {
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          attributeDeclarations: [
            {
              nodes: {
                name: { d: 'string' },
              },
              edges: {
                weight: { d: 'double' },
              },
              networkAttributes: {},
            },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const visualEditorProperties = getVisualEditorProperties(cx2)
      expect(visualEditorProperties.visualEditorProperties.nodeSizeLocked).toBe(false)
      expect(visualEditorProperties.visualEditorProperties.arrowColorMatchesEdge).toBe(false)
      expect(visualEditorProperties.visualEditorProperties.tableDisplayConfiguration.nodeTable.columnConfiguration).toHaveLength(1)
      expect(visualEditorProperties.visualEditorProperties.tableDisplayConfiguration.edgeTable.columnConfiguration).toHaveLength(1)
    })

    it('should ensure all attributes from declarations are in column configuration', () => {
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          attributeDeclarations: [
            {
              nodes: {
                name: { d: 'string' },
                score: { d: 'double' },
                type: { d: 'string' },
              },
              edges: {
                weight: { d: 'double' },
                interaction: { d: 'string' },
              },
              networkAttributes: {},
            },
          ],
        },
        {
          visualEditorProperties: [
            {
              properties: {
                nodeSizeLocked: false,
                arrowColorMatchesEdge: false,
                tableDisplayConfiguration: {
                  nodeTable: {
                    columnConfiguration: [
                      { attributeName: 'name', visible: true },
                    ],
                  },
                  edgeTable: {
                    columnConfiguration: [
                      { attributeName: 'weight', visible: true },
                    ],
                  },
                },
              },
            },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const visualEditorProperties = getVisualEditorProperties(cx2)
      const nodeConfig = visualEditorProperties.visualEditorProperties.tableDisplayConfiguration.nodeTable.columnConfiguration
      const edgeConfig = visualEditorProperties.visualEditorProperties.tableDisplayConfiguration.edgeTable.columnConfiguration

      // Should have all 3 node attributes
      expect(nodeConfig.length).toBeGreaterThanOrEqual(3)
      expect(nodeConfig.find(c => c.attributeName === 'name')).toBeDefined()
      expect(nodeConfig.find(c => c.attributeName === 'score')).toBeDefined()
      expect(nodeConfig.find(c => c.attributeName === 'type')).toBeDefined()

      // Should have all 2 edge attributes
      expect(edgeConfig.length).toBeGreaterThanOrEqual(2)
      expect(edgeConfig.find(c => c.attributeName === 'weight')).toBeDefined()
      expect(edgeConfig.find(c => c.attributeName === 'interaction')).toBeDefined()
    })
  })

  describe('getOptionalAspects', () => {
    it('should extract optional aspects from CX2', () => {
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          nodes: [{ id: 1 }],
        },
        {
          customAspect1: [
            { data: 'value1' },
          ],
        },
        {
          customAspect2: [
            { data: 'value2' },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const optionalAspects = getOptionalAspects(cx2)
      expect(optionalAspects).toHaveLength(2)
      expect(optionalAspects[0]).toHaveProperty('customAspect1')
      expect(optionalAspects[1]).toHaveProperty('customAspect2')
    })

    it('should filter out core aspects', () => {
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          nodes: [{ id: 1 }],
        },
        {
          edges: [{ id: 1, s: 1, t: 2 }],
        },
        {
          networkAttributes: [{ name: 'Test' }],
        },
        {
          customAspect: [{ data: 'value' }],
        },
        {
          status: [{ success: true }],
        },
      ]

      const optionalAspects = getOptionalAspects(cx2)
      expect(optionalAspects).toHaveLength(1)
      expect(optionalAspects[0]).toHaveProperty('customAspect')
      expect(optionalAspects[0]).not.toHaveProperty('nodes')
      expect(optionalAspects[0]).not.toHaveProperty('edges')
      expect(optionalAspects[0]).not.toHaveProperty('networkAttributes')
    })

    it('should filter out CXVersion and status', () => {
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          customAspect: [{ data: 'value' }],
        },
        {
          status: [{ success: true }],
        },
      ]

      const optionalAspects = getOptionalAspects(cx2)
      expect(optionalAspects).toHaveLength(1)
      expect(optionalAspects[0]).toHaveProperty('customAspect')
    })

    it('should return empty array when no optional aspects exist', () => {
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          nodes: [{ id: 1 }],
        },
        {
          status: [{ success: true }],
        },
      ]

      const optionalAspects = getOptionalAspects(cx2)
      expect(optionalAspects).toEqual([])
    })
  })
})

