import { Cx2 } from '../Cx2'
import { createCyNetworkFromCx2 } from './converter'

// to run these: npx jest src/models/CxModel/impl/converter.test.ts

describe('converter', () => {
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

  describe('createCyNetworkFromCx2', () => {
    it('should create a CyNetwork from a minimal CX2 document', () => {
      const networkId = 'test-network-1'
      const cx2 = createMinimalValidCx()

      const cyNetwork = createCyNetworkFromCx2(networkId, cx2)

      expect(cyNetwork.network.id).toBe(networkId)
      expect(cyNetwork.network.nodes).toEqual([])
      expect(cyNetwork.network.edges).toEqual([])
      expect(cyNetwork.nodeTable.id).toBe(`${networkId}-nodes`)
      expect(cyNetwork.edgeTable.id).toBe(`${networkId}-edges`)
      expect(cyNetwork.networkViews).toHaveLength(1)
      expect(cyNetwork.networkViews[0].id).toBe(networkId)
      expect(cyNetwork.undoRedoStack.undoStack).toEqual([])
      expect(cyNetwork.undoRedoStack.redoStack).toEqual([])
    })

    it('should create a CyNetwork with nodes and edges', () => {
      const networkId = 'test-network-2'
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
          edges: [
            { id: 1, s: 1, t: 2 },
            { id: 2, s: 2, t: 3 },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const cyNetwork = createCyNetworkFromCx2(networkId, cx2)

      expect(cyNetwork.network.id).toBe(networkId)
      expect(cyNetwork.network.nodes).toHaveLength(3)
      expect(cyNetwork.network.edges).toHaveLength(2)
      expect(cyNetwork.network.nodes.map(n => n.id)).toContain('1')
      expect(cyNetwork.network.nodes.map(n => n.id)).toContain('2')
      expect(cyNetwork.network.nodes.map(n => n.id)).toContain('3')
    })

    it('should create a CyNetwork with node attributes', () => {
      const networkId = 'test-network-3'
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          attributeDeclarations: [
            {
              nodes: {
                name: { d: 'string' },
                score: { d: 'double' },
              },
              edges: {},
              networkAttributes: {},
            },
          ],
        },
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
          edges: [],
        },
        {
          status: [{ success: true }],
        },
      ]

      const cyNetwork = createCyNetworkFromCx2(networkId, cx2)

      expect(cyNetwork.nodeTable.columns.length).toBeGreaterThan(0)
      const node1Row = cyNetwork.nodeTable.rows.get('1')
      expect(node1Row).toBeDefined()
      if (node1Row) {
        expect(node1Row.name).toBe('Node1')
        expect(node1Row.score).toBe(0.5)
      }
    })

    it('should create a CyNetwork with edge attributes', () => {
      const networkId = 'test-network-4'
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          attributeDeclarations: [
            {
              nodes: {},
              edges: {
                weight: { d: 'double' },
                interaction: { d: 'string' },
              },
              networkAttributes: {},
            },
          ],
        },
        {
          nodes: [
            { id: 1 },
            { id: 2 },
          ],
        },
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
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const cyNetwork = createCyNetworkFromCx2(networkId, cx2)

      expect(cyNetwork.edgeTable.columns.length).toBeGreaterThan(0)
      const edge1Row = cyNetwork.edgeTable.rows.get('e1')
      expect(edge1Row).toBeDefined()
      if (edge1Row) {
        expect(edge1Row.weight).toBe(0.5)
        expect(edge1Row.interaction).toBe('activates')
      }
    })

    it('should create a CyNetwork with network attributes', () => {
      const networkId = 'test-network-5'
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

      const cyNetwork = createCyNetworkFromCx2(networkId, cx2)

      expect(cyNetwork.networkAttributes).toBeDefined()
      if (cyNetwork.networkAttributes) {
        expect(cyNetwork.networkAttributes.attributes.name).toBe('Test Network')
        expect(cyNetwork.networkAttributes.attributes.version).toBe('1.0')
        expect(cyNetwork.networkAttributes.attributes.description).toBe('A test network')
      }
    })

    it('should create a CyNetwork with visual style options', () => {
      const networkId = 'test-network-6'
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          attributeDeclarations: [
            {
              nodes: {},
              edges: {},
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
                    columnConfiguration: [],
                  },
                  edgeTable: {
                    columnConfiguration: [],
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

      const cyNetwork = createCyNetworkFromCx2(networkId, cx2)

      expect(cyNetwork.visualStyleOptions).toBeDefined()
      if (cyNetwork.visualStyleOptions) {
        expect(cyNetwork.visualStyleOptions.visualEditorProperties.nodeSizeLocked).toBe(true)
        expect(cyNetwork.visualStyleOptions.visualEditorProperties.arrowColorMatchesEdge).toBe(false)
      }
    })

    it('should create a CyNetwork with optional aspects', () => {
      const networkId = 'test-network-7'
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          nodes: [{ id: 1 }],
        },
        {
          customAspect: [
            { data: 'value' },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const cyNetwork = createCyNetworkFromCx2(networkId, cx2)

      expect(cyNetwork.otherAspects).toBeDefined()
      expect(cyNetwork.otherAspects).toHaveLength(1)
      expect(cyNetwork.otherAspects![0]).toHaveProperty('customAspect')
    })

    it('should create a complete CyNetwork with all components', () => {
      const networkId = 'test-network-complete'
      const cx2: Cx2 = [
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
                version: { d: 'string' },
              },
            },
          ],
        },
        {
          networkAttributes: [
            {
              name: 'Complete Test Network',
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
          visualEditorProperties: [
            {
              properties: {
                nodeSizeLocked: false,
                arrowColorMatchesEdge: true,
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
          customAspect: [
            { data: 'custom value' },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const cyNetwork = createCyNetworkFromCx2(networkId, cx2)

      // Verify network structure
      expect(cyNetwork.network.id).toBe(networkId)
      expect(cyNetwork.network.nodes).toHaveLength(2)
      expect(cyNetwork.network.edges).toHaveLength(1)

      // Verify tables
      expect(cyNetwork.nodeTable.id).toBe(`${networkId}-nodes`)
      expect(cyNetwork.edgeTable.id).toBe(`${networkId}-edges`)
      expect(cyNetwork.nodeTable.columns.length).toBeGreaterThan(0)
      expect(cyNetwork.edgeTable.columns.length).toBeGreaterThan(0)

      // Verify network view
      expect(cyNetwork.networkViews).toHaveLength(1)
      expect(cyNetwork.networkViews[0].nodeViews['1'].x).toBe(10)
      expect(cyNetwork.networkViews[0].nodeViews['1'].y).toBe(20)
      expect(cyNetwork.networkViews[0].nodeViews['2'].x).toBe(30)
      expect(cyNetwork.networkViews[0].nodeViews['2'].y).toBe(40)

      // Verify network attributes
      expect(cyNetwork.networkAttributes).toBeDefined()
      if (cyNetwork.networkAttributes) {
        expect(cyNetwork.networkAttributes.attributes.name).toBe('Complete Test Network')
        expect(cyNetwork.networkAttributes.attributes.version).toBe('1.0')
      }

      // Verify visual style options
      expect(cyNetwork.visualStyleOptions).toBeDefined()
      if (cyNetwork.visualStyleOptions) {
        expect(cyNetwork.visualStyleOptions.visualEditorProperties.nodeSizeLocked).toBe(false)
        expect(cyNetwork.visualStyleOptions.visualEditorProperties.arrowColorMatchesEdge).toBe(true)
      }

      // Verify optional aspects
      expect(cyNetwork.otherAspects).toBeDefined()
      expect(cyNetwork.otherAspects).toHaveLength(1)

      // Verify undo/redo stack
      expect(cyNetwork.undoRedoStack.undoStack).toEqual([])
      expect(cyNetwork.undoRedoStack.redoStack).toEqual([])
    })

    it('should handle empty network correctly', () => {
      const networkId = 'test-network-empty'
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          nodes: [],
        },
        {
          edges: [],
        },
        {
          status: [{ success: true }],
        },
      ]

      const cyNetwork = createCyNetworkFromCx2(networkId, cx2)

      expect(cyNetwork.network.nodes).toEqual([])
      expect(cyNetwork.network.edges).toEqual([])
      expect(cyNetwork.nodeTable.rows.size).toBe(0)
      expect(cyNetwork.edgeTable.rows.size).toBe(0)
    })

    it('should initialize undo/redo stack as empty', () => {
      const networkId = 'test-network-undo'
      const cx2 = createMinimalValidCx()

      const cyNetwork = createCyNetworkFromCx2(networkId, cx2)

      expect(cyNetwork.undoRedoStack).toEqual({
        undoStack: [],
        redoStack: [],
      })
    })
  })
})

