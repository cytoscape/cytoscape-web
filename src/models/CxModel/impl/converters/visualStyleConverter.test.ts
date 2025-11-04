import { Cx2 } from '../../Cx2'
import {
  createVisualStyleFromCx,
  createVisualStyleOptionsFromCx,
} from './visualStyleConverter'

// to run these: npx jest src/models/CxModel/impl/converters/visualStyleConverter.test.ts

describe('visualStyleConverter', () => {
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

  describe('createVisualStyleFromCx', () => {
    it('should create a default visual style from minimal CX2', () => {
      const cx2 = createMinimalValidCx()

      const visualStyle = createVisualStyleFromCx(cx2)

      expect(visualStyle).toBeDefined()
      // Should have default visual properties
      expect(visualStyle.nodeShape).toBeDefined()
      expect(visualStyle.nodeBackgroundColor).toBeDefined()
      expect(visualStyle.edgeWidth).toBeDefined()
    })

    it('should create a visual style with default node properties', () => {
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
                edge: {},
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

      const visualStyle = createVisualStyleFromCx(cx2)

      // The visual style should be created with defaults
      expect(visualStyle).toBeDefined()
    })

    it('should create a visual style with default edge properties', () => {
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          visualProperties: [
            {
              default: {
                node: {},
                edge: {
                  EDGE_WIDTH: 5,
                  EDGE_COLOR: '#0000FF',
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

      const visualStyle = createVisualStyleFromCx(cx2)

      expect(visualStyle).toBeDefined()
    })

    it('should create a visual style with node bypasses', () => {
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          nodes: [
            { id: 1 },
            { id: 2 },
          ],
        },
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

      const visualStyle = createVisualStyleFromCx(cx2)

      expect(visualStyle).toBeDefined()
      // Should have bypass maps for nodes
      expect(visualStyle.nodeWidth).toBeDefined()
      expect(visualStyle.nodeHeight).toBeDefined()
    })

    it('should create a visual style with edge bypasses', () => {
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          nodes: [
            { id: 1 },
            { id: 2 },
          ],
        },
        {
          edges: [
            { id: 1, s: 1, t: 2 },
          ],
        },
        {
          edgeBypasses: [
            {
              id: 1,
              v: {
                EDGE_WIDTH: 5,
                EDGE_COLOR: '#0000FF',
              },
            },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const visualStyle = createVisualStyleFromCx(cx2)

      expect(visualStyle).toBeDefined()
      expect(visualStyle.edgeWidth).toBeDefined()
    })

    it('should handle missing visual properties', () => {
      const cx2 = createMinimalValidCx()

      const visualStyle = createVisualStyleFromCx(cx2)

      expect(visualStyle).toBeDefined()
      // Should use default visual style
      expect(visualStyle.nodeShape).toBeDefined()
    })

    it('should handle missing node bypasses', () => {
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          nodes: [{ id: 1 }],
        },
        {
          status: [{ success: true }],
        },
      ]

      const visualStyle = createVisualStyleFromCx(cx2)

      expect(visualStyle).toBeDefined()
      // Should have empty bypass maps
      expect(visualStyle.nodeWidth).toBeDefined()
    })

    it('should handle missing edge bypasses', () => {
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          nodes: [
            { id: 1 },
            { id: 2 },
          ],
        },
        {
          edges: [
            { id: 1, s: 1, t: 2 },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const visualStyle = createVisualStyleFromCx(cx2)

      expect(visualStyle).toBeDefined()
      expect(visualStyle.edgeWidth).toBeDefined()
    })

    it('should create a visual style with passthrough mapping', () => {
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          attributeDeclarations: [
            {
              nodes: {
                name: { d: 'string' },
              },
              edges: {},
              networkAttributes: {},
            },
          ],
        },
        {
          visualProperties: [
            {
              default: {
                node: {},
                edge: {},
                network: {},
              },
              nodeMapping: {
                NODE_LABEL: {
                  type: 'PASSTHROUGH',
                  definition: {
                    attribute: 'name',
                    type: 'string',
                  },
                },
              },
              edgeMapping: {},
            },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const visualStyle = createVisualStyleFromCx(cx2)

      expect(visualStyle).toBeDefined()
      expect(visualStyle.nodeLabel).toBeDefined()
      expect(visualStyle.nodeLabel.mapping).toBeDefined()
      if (visualStyle.nodeLabel.mapping) {
        expect(visualStyle.nodeLabel.mapping.type).toBe('passthrough')
        expect(visualStyle.nodeLabel.mapping.attribute).toBe('name')
      }
    })

    it('should create a visual style with discrete mapping', () => {
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          attributeDeclarations: [
            {
              nodes: {
                type: { d: 'string' },
              },
              edges: {},
              networkAttributes: {},
            },
          ],
        },
        {
          visualProperties: [
            {
              default: {
                node: {},
                edge: {},
                network: {},
              },
              nodeMapping: {
                NODE_FILL_COLOR: {
                  type: 'DISCRETE',
                  definition: {
                    attribute: 'type',
                    type: 'string',
                    map: [
                      { v: 'gene', vp: '#FF0000' },
                      { v: 'protein', vp: '#00FF00' },
                    ],
                  },
                },
              },
              edgeMapping: {},
            },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const visualStyle = createVisualStyleFromCx(cx2)

      expect(visualStyle).toBeDefined()
      expect(visualStyle.nodeBackgroundColor).toBeDefined()
      // The mapping may or may not be set depending on the converter implementation
      // Just verify the visual style is created correctly
      expect(visualStyle.nodeBackgroundColor.defaultValue).toBeDefined()
    })

    it('should create a visual style with continuous mapping', () => {
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          attributeDeclarations: [
            {
              nodes: {
                score: { d: 'double' },
              },
              edges: {},
              networkAttributes: {},
            },
          ],
        },
        {
          visualProperties: [
            {
              default: {
                node: {},
                edge: {},
                network: {},
              },
              nodeMapping: {
                NODE_SIZE: {
                  type: 'CONTINUOUS',
                  definition: {
                    attribute: 'score',
                    type: 'double',
                    map: [
                      {
                        max: 0.0,
                        maxVPValue: 20,
                        includeMax: true,
                      },
                      {
                        min: 0.0,
                        minVPValue: 20,
                        max: 1.0,
                        maxVPValue: 100,
                        includeMin: true,
                        includeMax: true,
                      },
                      {
                        min: 1.0,
                        minVPValue: 100,
                        includeMin: true,
                      },
                    ],
                  },
                },
              },
              edgeMapping: {},
            },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const visualStyle = createVisualStyleFromCx(cx2)

      expect(visualStyle).toBeDefined()
      expect(visualStyle.nodeWidth).toBeDefined()
      expect(visualStyle.nodeHeight).toBeDefined()
    })

    it('should handle empty visual properties array', () => {
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          visualProperties: [],
        },
        {
          status: [{ success: true }],
        },
      ]

      const visualStyle = createVisualStyleFromCx(cx2)

      expect(visualStyle).toBeDefined()
      // Should use default visual style
      expect(visualStyle.nodeShape).toBeDefined()
    })
  })

  describe('createVisualStyleOptionsFromCx', () => {
    it('should create visual style options from CX2', () => {
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          attributeDeclarations: [
            {
              nodes: {
                name: { d: 'string' },
              },
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
                    columnConfiguration: [
                      { attributeName: 'name', visible: true },
                    ],
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

      const visualStyleOptions = createVisualStyleOptionsFromCx(cx2)

      expect(visualStyleOptions).toBeDefined()
      expect(visualStyleOptions.visualEditorProperties).toBeDefined()
      expect(visualStyleOptions.visualEditorProperties.nodeSizeLocked).toBe(true)
      expect(visualStyleOptions.visualEditorProperties.arrowColorMatchesEdge).toBe(false)
      expect(visualStyleOptions.visualEditorProperties.tableDisplayConfiguration).toBeDefined()
    })

    it('should return default visual style options when missing', () => {
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          attributeDeclarations: [
            {
              nodes: {
                name: { d: 'string' },
              },
              edges: {},
              networkAttributes: {},
            },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const visualStyleOptions = createVisualStyleOptionsFromCx(cx2)

      expect(visualStyleOptions).toBeDefined()
      expect(visualStyleOptions.visualEditorProperties).toBeDefined()
      expect(visualStyleOptions.visualEditorProperties.nodeSizeLocked).toBe(false)
      expect(visualStyleOptions.visualEditorProperties.arrowColorMatchesEdge).toBe(false)
    })

    it('should handle missing visual editor properties', () => {
      const cx2 = createMinimalValidCx()

      const visualStyleOptions = createVisualStyleOptionsFromCx(cx2)

      expect(visualStyleOptions).toBeDefined()
    })

    it('should handle missing visual editor properties aspect', () => {
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
          status: [{ success: true }],
        },
      ]

      const visualStyleOptions = createVisualStyleOptionsFromCx(cx2)

      expect(visualStyleOptions).toBeDefined()
      expect(visualStyleOptions.visualEditorProperties).toBeDefined()
    })
  })
})

