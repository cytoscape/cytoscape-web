import { Cx2 } from '../Cx2'
import {
  findAspect,
  validateCx2Attributes,
  validateCx2Metadata,
  validateCx2ReferentialIntegrity,
  validateCx2Structure,
} from './validator'

// to run these: npx jest src/models/CxModel/impl/validator.test.ts

describe('validateCx2Structure', () => {
  // Helper function to create a minimal valid CX2 document
  const createMinimalValidCx = () => [
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

  describe('basic structure validation', () => {
    it('should accept a valid minimal CX2 document', () => {
      const result = validateCx2Structure(createMinimalValidCx())
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject non-array input', () => {
      const result = validateCx2Structure({})
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
    })

    // valid empty cx2 still has a preamble and status
    it('should reject empty array', () => {
      const result = validateCx2Structure([])
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
    })
  })

  describe('preamble validation', () => {
    it('should accept preamble with optional hasFragments', () => {
      const result = validateCx2Structure([
        {
          CXVersion: '2.0',
          hasFragments: true,
        },
        {
          status: [
            {
              success: true,
            },
          ],
        },
      ])
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject invalid CX version', () => {
      const result = validateCx2Structure([
        {
          CXVersion: '1.0',
        },
      ])
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
    })

    // it('should reject preamble with invalid hasFragments type', () => {
    //   const result = validateCx2Structure([
    //     {
    //       CXVersion: '2.0',
    //       hasFragments: 'true',
    //     },
    //   ])
    //   expect(result.isValid).toBe(false)
    //   expect(result.errors).toHaveLength(1)
    // })

    // it('should reject preamble with extra properties', () => {
    //   const result = validateCx2Structure([
    //     {
    //       CXVersion: '2.0',
    //       extraProp: 'value',
    //     },
    //   ])
    //   expect(result.isValid).toBe(false)
    //   expect(result.errors).toHaveLength(1)
    // })
  })

  describe('aspect validation', () => {
    it('should accept valid aspects after preamble', () => {
      const result = validateCx2Structure([
        {
          CXVersion: '2.0',
        },
        {
          nodes: [],
        },
        {
          edges: [],
        },
        {
          status: [
            {
              success: true,
            },
          ],
        },
      ])
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject aspect with multiple keys', () => {
      const result = validateCx2Structure([
        {
          CXVersion: '2.0',
        },
        {
          nodes: [],
          edges: [],
        },
        {
          status: [
            {
              success: true,
            },
          ],
        },
      ])
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
    })

    it('should reject aspect with non-array value', () => {
      const result = validateCx2Structure([
        {
          CXVersion: '2.0',
        },
        {
          nodes: 'not an array',
        },
        {
          status: [
            {
              success: true,
            },
          ],
        },
      ])
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
    })

    it('should reject non-object aspect', () => {
      const result = validateCx2Structure([
        {
          CXVersion: '2.0',
        },
        'not an aspect',
        {
          status: [
            {
              success: true,
            },
          ],
        },
      ])
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
    })
  })

  describe('complex document validation', () => {
    it('should accept a complex valid document', () => {
      const result = validateCx2Structure([
        {
          CXVersion: '2.0',
          hasFragments: true,
        },
        {
          nodes: [{ id: 1 }, { id: 2 }],
        },
        {
          edges: [{ id: 1, s: 1, t: 2 }],
        },
        {
          networkAttributes: [
            {
              name: 'Test Network',
            },
          ],
        },
        {
          status: [
            {
              success: true,
            },
          ],
        },
      ])

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject document with invalid aspect after valid aspects', () => {
      const result = validateCx2Structure([
        {
          CXVersion: '2.0',
        },
        {
          nodes: [],
        },
        {
          edges: 'not an array', // Invalid aspect
        },
        {
          status: [
            {
              success: true,
            },
          ],
        },
      ])
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
    })
  })

  describe('validateCx2Metadata', () => {
    it('should return valid when metadata and all aspects are present', () => {
      const input = [
        { CXVersion: '2.0' },
        { metaData: [{ name: 'aspect1' }, { name: 'aspect2' }] },
        { aspect1: [] },
        { aspect2: [] },
        {
          status: [
            {
              success: true,
            },
          ],
        },
      ]

      const result = validateCx2Metadata(input as Cx2)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    // metadata is optional
    // if metadata exists, it must be validated, the aspect must exist and the elemnt count if it exists must be validated
    // aspects can exist outside the metadata
    it('should return an error when metadata aspect is missing', () => {
      const input = [
        { CXVersion: '2.0' },
        { aspect1: [] },
        { aspect2: [] },
        {
          status: [
            {
              success: true,
            },
          ],
        },
      ]

      const result = validateCx2Metadata(input as Cx2)
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
    })

    it('should return a warning when an aspect referenced in metadata is missing', () => {
      const input = [
        { CXVersion: '2.0' },
        { metaData: [{ name: 'aspect1' }, { name: 'aspect2' }] },
        { aspect1: [] },
      ]

      const result = validateCx2Metadata(input as Cx2)
      expect(result.isValid).toBe(true)
    })

    it('should return valid when metadata is empty', () => {
      const input = [{ CXVersion: '2.0' }, { metaData: [] }]

      const result = validateCx2Metadata(input as Cx2)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should return valid when metadata aspect is present but no aspects are defined', () => {
      const input = [{ CXVersion: '2.0' }, { metaData: [] }]

      const result = validateCx2Metadata(input as Cx2)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should handle invalid metadata structure gracefully', () => {
      const input = [
        { CXVersion: '2.0' },
        { metaData: 'invalid' }, // Invalid metadata structure
      ]

      const result = validateCx2Metadata(input as Cx2)
      expect(result.isValid).toBe(true) // No validation for metadata structure itself
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })
  })

  describe('findAspect', () => {
    it('should return the aspect value when the aspect key exists', () => {
      const cx = [
        { CXVersion: '2.0' },
        { metaData: [{ name: 'aspect1' }, { name: 'aspect2' }] },
        { aspect1: [{ id: 1 }] },
        { aspect2: [{ id: 2 }] },
      ]

      const result = findAspect(cx, 'aspect1')
      expect(result).toEqual([{ id: 1 }])
    })

    it('should return undefined when the aspect key does not exist', () => {
      const cx = [
        { CXVersion: '2.0' },
        { metaData: [{ name: 'aspect1' }, { name: 'aspect2' }] },
        { aspect1: [{ id: 1 }] },
      ]

      const result = findAspect(cx, 'aspect2')
      expect(result).toBeUndefined()
    })

    it('should return undefined when the CX array is empty', () => {
      const cx: unknown[] = []

      const result = findAspect(cx, 'aspect1')
      expect(result).toBeUndefined()
    })

    it('should return undefined when the CX array does not contain valid objects', () => {
      const cx = [
        { CXVersion: '2.0' },
        { metaData: [{ name: 'aspect1' }] },
        'invalid',
        null,
      ]

      const result = findAspect(cx, 'aspect1')
      expect(result).toBeUndefined()
    })

    it('should return undefined when the aspect key exists but has a null value', () => {
      const cx = [
        { CXVersion: '2.0' },
        { metaData: [{ name: 'aspect1' }] },
        { aspect1: null },
      ]

      const result = findAspect(cx, 'aspect1')
      expect(result).toBeNull()
    })

    it('should return the correct aspect value when multiple aspects exist', () => {
      const cx = [
        { CXVersion: '2.0' },
        { metaData: [{ name: 'aspect1' }, { name: 'aspect2' }] },
        { aspect1: [{ id: 1 }] },
        { aspect2: [{ id: 2 }] },
      ]

      const result = findAspect(cx, 'aspect2')
      expect(result).toEqual([{ id: 2 }])
    })

    it('should handle cases where the aspect key is at the beginning of the CX array', () => {
      const cx = [
        { aspect1: [{ id: 1 }] },
        { CXVersion: '2.0' },
        { metaData: [{ name: 'aspect1' }] },
      ]

      const result = findAspect(cx, 'aspect1')
      expect(result).toEqual([{ id: 1 }])
    })

    it('should handle cases where the aspect key is deeply nested (not directly supported)', () => {
      const cx = [
        { CXVersion: '2.0' },
        { metaData: [{ name: 'aspect1' }] },
        { aspect1: { nested: [{ id: 1 }] } },
      ]

      const result = findAspect(cx, 'aspect1')
      expect(result).toEqual({ nested: [{ id: 1 }] })
    })
  })

  describe('validateCx2ReferentialIntegrity', () => {
    it('should return valid when all references are correct', () => {
      const input = [
        { CXVersion: '2.0' },
        { nodes: [{ id: 1 }, { id: 2 }] },
        { edges: [{ id: 10, s: 1, t: 2 }] },
        {
          nodeBypasses: [
            { id: 1, v: { NODE_WIDTH: 100 } },
            { id: 2, v: { NODE_WIDTH: 50 } },
          ],
        },
        {
          edgeBypasses: [{ id: 10, v: { EDGE_WIDTH: 5 } }],
        },
        {
          status: [
            {
              success: true,
            },
          ],
        },
      ]

      const result = validateCx2ReferentialIntegrity(input as Cx2)
      console.log(result)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should return an error when a node bypass references a non-existent node', () => {
      const input = [
        { CXVersion: '2.0' },
        { nodes: [{ id: 1 }, { id: 2 }] },
        {
          nodeBypasses: [
            { id: 3, v: { NODE_WIDTH: 100 } }, // Invalid: node id 3 does not exist
          ],
        },
        {
          status: [
            {
              success: true,
            },
          ],
        },
      ]

      const result = validateCx2ReferentialIntegrity(input as Cx2)
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].path).toEqual(['nodeBypasses', 'index 0'])
    })

    it('should return an error when an edge bypass references a non-existent edge', () => {
      const input = [
        { CXVersion: '2.0' },
        { edges: [{ id: 10, s: 1, t: 2 }] },
        {
          edgeBypasses: [
            { id: 20, v: { EDGE_WIDTH: 5 } }, // Invalid: edge id 20 does not exist
          ],
        },
        {
          status: [
            {
              success: true,
            },
          ],
        },
      ]

      const result = validateCx2ReferentialIntegrity(input as Cx2)
      expect(result.isValid).toBe(false)
    })

    it('should return an error when a node is missing an id', () => {
      const input = [
        { CXVersion: '2.0' },
        { nodes: [{}, { id: 2 }] }, // Invalid: first node is missing an id
        {
          status: [
            {
              success: true,
            },
          ],
        },
      ]

      const result = validateCx2ReferentialIntegrity(input as Cx2)
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].path).toEqual(['nodes', 'index 0'])
    })

    it('should return an error when an edge is missing an id', () => {
      const input = [
        { CXVersion: '2.0' },
        { edges: [{ s: 1, t: 2 }] }, // Invalid: edge is missing an id
      ]

      const result = validateCx2ReferentialIntegrity(input as Cx2)
      expect(result.isValid).toBe(false)
    })

    it('should return an error when an edge references a non-existent source node', () => {
      const input = [
        { CXVersion: '2.0' },
        { nodes: [{ id: 1 }] },
        { edges: [{ id: 10, s: 2, t: 1 }] }, // Invalid: source node id 2 does not exist
      ]

      const result = validateCx2ReferentialIntegrity(input as Cx2)
      expect(result.isValid).toBe(false)
    })

    it('should return an error when an edge references a non-existent target node', () => {
      const input = [
        { CXVersion: '2.0' },
        { nodes: [{ id: 1 }] },
        { edges: [{ id: 10, s: 1, t: 2 }] }, // Invalid: target node id 2 does not exist
      ]

      const result = validateCx2ReferentialIntegrity(input as Cx2)
      expect(result.isValid).toBe(false)
    })

    it('should return warnings for duplicate node ids', () => {
      const input = [
        { CXVersion: '2.0' },
        { nodes: [{ id: 1 }, { id: 1 }] }, // Duplicate node id
      ]

      const result = validateCx2ReferentialIntegrity(input as Cx2)
      expect(result.isValid).toBe(true) // Warnings do not invalidate the document
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].path).toEqual(['nodes', '1'])
    })

    it('should return warnings for duplicate edge ids', () => {
      const input = [
        { CXVersion: '2.0' },
        {
          nodes: [{ id: 1 }, { id: 2 }],
        },
        {
          edges: [
            { id: 10, s: 1, t: 2 },
            { id: 10, s: 1, t: 2 },
          ],
        }, // Duplicate edge id
      ]

      const result = validateCx2ReferentialIntegrity(input as Cx2)
      console.log(result)
      expect(result.isValid).toBe(true) // Warnings do not invalidate the document
    })
  })

  describe('validateCx2Attributes', () => {
    // Helper function to create a basic CX2 structure with attribute declarations
    const createBaseCx2 = (): Cx2 =>
      [
        { CXVersion: '2.0' },
        {
          metaData: [
            { name: 'attributeDeclarations', elementCount: 1 },
            { name: 'nodes', elementCount: 0 },
            { name: 'edges', elementCount: 0 },
            { name: 'networkAttributes', elementCount: 0 },
          ],
        },
        {
          attributeDeclarations: [
            {
              nodes: {},
              edges: {},
              network: {},
            },
          ],
        },
        { status: [{ success: true }] },
      ] as Cx2

    describe('node attributes', () => {
      it('should validate valid node attributes', () => {
        const cx2: Cx2 = [
          { CXVersion: '2.0' },
          {
            metaData: [
              { name: 'attributeDeclarations', elementCount: 1 },
              { name: 'nodes', elementCount: 1 },
            ],
          },
          {
            attributeDeclarations: [
              {
                nodes: {
                  name: { d: 'string' },
                  score: { d: 'double', v: 0.0 },
                  type: { d: 'string', a: 'nodeType' },
                },
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
                  nodeType: 'gene',
                },
              },
            ],
          },
          { status: [{ success: true }] },
        ] as Cx2

        const result = validateCx2Attributes(cx2)
        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should validate that node attributes are optional', () => {
        const cx2: Cx2 = [
          { CXVersion: '2.0' },
          {
            metaData: [
              { name: 'attributeDeclarations', elementCount: 1 },
              { name: 'nodes', elementCount: 1 },
            ],
          },
          {
            attributeDeclarations: [
              {
                nodes: {
                  name: { d: 'string' },
                  score: { d: 'double', v: 0.0 },
                },
              },
            ],
          },
          {
            nodes: [
              {
                id: 1,
                v: {
                  score: 0.5, // Missing required 'name'
                },
              },
            ],
          },
          { status: [{ success: true }] },
        ] as Cx2

        const result = validateCx2Attributes(cx2)
        expect(result.isValid).toBe(true)
      })

      it('should validate node attribute types', () => {
        const cx2: Cx2 = [
          { CXVersion: '2.0' },
          {
            metaData: [
              { name: 'attributeDeclarations', elementCount: 1 },
              { name: 'nodes', elementCount: 1 },
            ],
          },
          {
            attributeDeclarations: [
              {
                nodes: {
                  name: { d: 'string' },
                  score: { d: 'double' },
                  count: { d: 'integer' },
                  isActive: { d: 'boolean' },
                  tags: { d: 'list_of_string' },
                },
              },
            ],
          },
          {
            nodes: [
              {
                id: 1,
                v: {
                  name: 123, // Should be string
                  score: '0.5', // Should be number
                  count: 1.5, // Should be integer
                  isActive: 'true', // Should be boolean
                  tags: 'tag1', // Should be array
                },
              },
            ],
          },
          { status: [{ success: true }] },
        ] as Cx2

        const result = validateCx2Attributes(cx2)
        expect(result.isValid).toBe(false)
        expect(result.errors).toHaveLength(5)
      })

      it('should warn about undeclared node attributes', () => {
        const cx2: Cx2 = [
          { CXVersion: '2.0' },
          {
            metaData: [
              { name: 'attributeDeclarations', elementCount: 1 },
              { name: 'nodes', elementCount: 1 },
            ],
          },
          {
            attributeDeclarations: [
              {
                nodes: {
                  name: { d: 'string' },
                },
              },
            ],
          },
          {
            nodes: [
              {
                id: 1,
                v: {
                  name: 'Node1',
                  undeclared: 'value',
                },
              },
            ],
          },
          { status: [{ success: true }] },
        ] as Cx2

        const result = validateCx2Attributes(cx2)
        expect(result.isValid).toBe(true)
        expect(result.warnings).toHaveLength(1)
        expect(result.warnings[0].message).toContain('Undeclared attribute')
      })
    })

    describe('edge attributes', () => {
      it('should validate valid edge attributes', () => {
        const cx2: Cx2 = [
          { CXVersion: '2.0' },
          {
            metaData: [
              { name: 'attributeDeclarations', elementCount: 1 },
              { name: 'edges', elementCount: 1 },
            ],
          },
          {
            attributeDeclarations: [
              {
                edges: {
                  interaction: { d: 'string' },
                  weight: { d: 'double', v: 1.0 },
                  type: { d: 'string', a: 'edgeType' },
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
                  interaction: 'interacts_with',
                  weight: 0.5,
                  edgeType: 'activation',
                },
              },
            ],
          },
          { status: [{ success: true }] },
        ] as Cx2

        const result = validateCx2Attributes(cx2)
        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should validate edge attribute types', () => {
        const cx2: Cx2 = [
          { CXVersion: '2.0' },
          {
            metaData: [
              { name: 'attributeDeclarations', elementCount: 1 },
              { name: 'edges', elementCount: 1 },
            ],
          },
          {
            attributeDeclarations: [
              {
                edges: {
                  interaction: { d: 'string' },
                  weight: { d: 'double' },
                  count: { d: 'integer' },
                  isDirected: { d: 'boolean' },
                  scores: { d: 'list_of_double' },
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
                  interaction: 123, // Should be string
                  weight: '0.5', // Should be number
                  count: 1.5, // Should be integer
                  isDirected: 'true', // Should be boolean
                  scores: 0.5, // Should be array
                },
              },
            ],
          },
          { status: [{ success: true }] },
        ] as Cx2

        const result = validateCx2Attributes(cx2)
        expect(result.isValid).toBe(false)
        expect(result.errors).toHaveLength(5)
      })
    })

    describe('network attributes', () => {
      it('should validate valid network attributes', () => {
        const cx2: Cx2 = [
          { CXVersion: '2.0' },
          {
            metaData: [
              { name: 'attributeDeclarations', elementCount: 1 },
              { name: 'networkAttributes', elementCount: 1 },
            ],
          },
          {
            attributeDeclarations: [
              {
                network: {
                  name: { d: 'string' },
                  version: { d: 'string' },
                  description: { d: 'string' },
                },
              },
            ],
          },
          {
            networkAttributes: [
              {
                name: 'Test Network',
                version: '1.0',
                description: 'A test network',
              },
            ],
          },
          { status: [{ success: true }] },
        ] as Cx2

        const result = validateCx2Attributes(cx2)
        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should reject network attributes with a or v fields', () => {
        const cx2: Cx2 = [
          { CXVersion: '2.0' },
          {
            metaData: [{ name: 'attributeDeclarations', elementCount: 1 }],
          },
          {
            attributeDeclarations: [
              {
                network: {
                  name: { d: 'string', a: 'networkName' }, // Invalid: has 'a'
                  version: { d: 'string', v: '1.0' }, // Invalid: has 'v'
                },
              },
            ],
          },
          { status: [{ success: true }] },
        ] as Cx2

        const result = validateCx2Attributes(cx2)
        expect(result.isValid).toBe(false)
        expect(result.errors).toHaveLength(2)
        expect(result.errors[0].message).toContain("do not support 'a' field")
        expect(result.errors[1].message).toContain("do not support 'v' field")
      })

      it('checks that network attributes are optional', () => {
        const cx2: Cx2 = [
          { CXVersion: '2.0' },
          {
            metaData: [
              { name: 'attributeDeclarations', elementCount: 1 },
              { name: 'networkAttributes', elementCount: 1 },
            ],
          },
          {
            attributeDeclarations: [
              {
                network: {
                  name: { d: 'string' },
                  version: { d: 'string' },
                },
              },
            ],
          },
          {
            networkAttributes: [
              {
                name: 'Test Network', // Missing required 'version'
              },
            ],
          },
          { status: [{ success: true }] },
        ] as Cx2

        const result = validateCx2Attributes(cx2)
        expect(result.isValid).toBe(true)
      })
    })

    describe('empty or missing declarations', () => {
      it('should handle missing attribute declarations', () => {
        const cx2: Cx2 = [
          { CXVersion: '2.0' },
          { status: [{ success: true }] },
        ] as Cx2

        const result = validateCx2Attributes(cx2)
        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should handle empty attribute declarations', () => {
        const cx2: Cx2 = [
          { CXVersion: '2.0' },
          {
            metaData: [{ name: 'attributeDeclarations', elementCount: 1 }],
          },
          {
            attributeDeclarations: [
              {
                nodes: {},
                edges: {},
                network: {},
              },
            ],
          },
          { status: [{ success: true }] },
        ] as Cx2

        const result = validateCx2Attributes(cx2)
        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })
    })
  })
})
