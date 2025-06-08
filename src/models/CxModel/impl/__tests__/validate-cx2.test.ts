import { validateCx2 } from '../cx-validators'
import { ValueTypeName } from '../../../TableModel'

describe('validateCx2', () => {
  // Helper function to create a minimal valid CX document
  const createMinimalValidCx = () => [
    { CXVersion: '2.0' }, // preamble
    { metaData: [{ name: 'nodes', elementCount: 0 }] }, // metadata
  ]

  describe('Document Structure Validation', () => {
    test('should accept a valid CX document', () => {
      const cx = createMinimalValidCx()
      const result = validateCx2(cx)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.version).toBe('2.0')
    })

    test('should reject non-array input', () => {
      const result = validateCx2({})
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('INVALID_STRUCTURE')
    })

    test('should reject empty array', () => {
      const result = validateCx2([])
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('INVALID_STRUCTURE')
    })

    test('should reject array without preamble', () => {
      const result = validateCx2([{ metaData: [] }])
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('INVALID_STRUCTURE')
    })
  })

  describe('Preamble Validation', () => {
    test('should reject invalid CX version', () => {
      const cx = [{ CXVersion: '1.0' }, { metaData: [] }]
      const result = validateCx2(cx)
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('INVALID_PREAMBLE')
    })

    test('should accept valid hasFragments flag', () => {
      const cx = [
        { CXVersion: '2.0', hasFragments: true },
        { metaData: [{ name: 'nodes', elementCount: 0 }] },
      ]
      const result = validateCx2(cx)
      expect(result.isValid).toBe(true)
    })
  })

  describe('Metadata Validation', () => {
    test('should validate aspect counts', () => {
      const cx = [
        { CXVersion: '2.0' },
        { metaData: [{ name: 'nodes', elementCount: 2 }] },
        { nodes: [{ id: 1 }, { id: 2 }, { id: 3 }] }, // 3 nodes when 2 declared
      ]
      const result = validateCx2(cx)
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('COUNT_MISMATCH')
    })

    test('should warn about undeclared aspects', () => {
      const cx = [
        { CXVersion: '2.0' },
        { metaData: [{ name: 'nodes', elementCount: 0 }] },
        { nodes: [] },
        { edges: [] }, // Undeclared aspect
      ]
      const result = validateCx2(cx)
      expect(result.isValid).toBe(true)
      expect(result.warnings[0].code).toBe('UNDECLARED_ASPECT')
    })
  })

  describe('Node Validation', () => {
    test('should validate node IDs', () => {
      const cx = [
        { CXVersion: '2.0' },
        { metaData: [{ name: 'nodes', elementCount: 2 }] },
        { nodes: [{ id: 1 }, { id: 1 }] }, // Duplicate ID
      ]
      const result = validateCx2(cx)
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('DUPLICATE_NODE_ID')
    })

    test('should validate node attributes against declarations', () => {
      const cx = [
        { CXVersion: '2.0' },
        {
          metaData: [
            { name: 'nodes', elementCount: 1 },
            { name: 'attributeDeclarations', elementCount: 1 },
          ],
        },
        {
          attributeDeclarations: [
            {
              nodes: {
                name: { d: ValueTypeName.String },
              },
            },
          ],
        },
        { nodes: [{ id: 1, name: 123 }] }, // name should be string
      ]
      const result = validateCx2(cx)
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('INVALID_ATTRIBUTE_DECLARATIONS')
    })
  })

  describe('Edge Validation', () => {
    test('should validate edge references', () => {
      const cx = [
        { CXVersion: '2.0' },
        {
          metaData: [
            { name: 'nodes', elementCount: 1 },
            { name: 'edges', elementCount: 1 },
          ],
        },
        { nodes: [{ id: 1 }] },
        { edges: [{ id: 1, s: 2, t: 1 }] }, // Invalid source node
      ]
      const result = validateCx2(cx)
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('INVALID_EDGE_SOURCE')
    })

    test('should validate edge IDs', () => {
      const cx = [
        { CXVersion: '2.0' },
        {
          metaData: [
            { name: 'nodes', elementCount: 2 },
            { name: 'edges', elementCount: 2 },
          ],
        },
        { nodes: [{ id: 1 }, { id: 2 }] },
        {
          edges: [
            { id: 1, s: 1, t: 2 },
            { id: 1, s: 2, t: 1 }, // Duplicate edge ID
          ],
        },
      ]
      const result = validateCx2(cx)
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('DUPLICATE_EDGE_ID')
    })
  })

  describe('Bypass Validation', () => {
    test('should validate node bypasses structure', () => {
      const cx = [
        { CXVersion: '2.0' },
        {
          metaData: [
            { name: 'nodes', elementCount: 1 },
            { name: 'nodeBypasses', elementCount: 1 },
          ],
        },
        { nodes: [{ id: 1 }] },
        { nodeBypasses: 'invalid' }, // Should be array
      ]
      const result = validateCx2(cx)
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('INVALID_NODE_BYPASSES_ASPECT')
    })

    test('should validate edge bypasses structure', () => {
      const cx = [
        { CXVersion: '2.0' },
        {
          metaData: [
            { name: 'edges', elementCount: 1 },
            { name: 'edgeBypasses', elementCount: 1 },
          ],
        },
        { edges: [{ id: 1, s: 1, t: 1 }] },
        { edgeBypasses: 'invalid' }, // Should be array
      ]
      const result = validateCx2(cx)
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('INVALID_EDGE_BYPASSES_ASPECT')
    })
  })

  describe('Integration Tests', () => {
    test('should validate a complete valid document', () => {
      const cx = [
        { CXVersion: '2.0' },
        {
          metaData: [
            { name: 'nodes', elementCount: 2 },
            { name: 'edges', elementCount: 1 },
            { name: 'networkAttributes', elementCount: 1 },
            { name: 'attributeDeclarations', elementCount: 1 },
          ],
        },
        {
          attributeDeclarations: [
            {
              nodes: {
                name: { d: ValueTypeName.String },
              },
              edges: {
                weight: { d: ValueTypeName.Double },
              },
              networkAttributes: {
                name: { d: ValueTypeName.String },
                description: { d: ValueTypeName.String },
              },
            },
          ],
        },
        {
          nodes: [
            { id: 1, v: { name: 'Node 1' } },
            { id: 2, v: { name: 'Node 2' } },
          ],
        },
        { edges: [{ id: 1, s: 1, t: 2, v: { weight: 1.5 } }] },
        {
          networkAttributes: {
            name: 'Test Network',
            description: 'A test network',
          },
        },
      ]
      const result = validateCx2(cx)
      // Log the actual errors for debugging
      if (!result.isValid) {
        console.log(
          'Validation errors:',
          JSON.stringify(result.errors, null, 2),
        )
      }
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    test('should collect all validation issues', () => {
      const cx = [
        { CXVersion: '2.0' },
        {
          metaData: [
            { name: 'nodes', elementCount: 2 },
            { name: 'edges', elementCount: 1 },
            { name: 'attributeDeclarations', elementCount: 1 },
          ],
        },
        {
          attributeDeclarations: [
            {
              nodes: {
                name: { d: ValueTypeName.String },
              },
            },
          ],
        },
        {
          nodes: [
            { id: 1, name: 123 }, // Invalid type
            { id: 1 }, // Duplicate ID
          ],
        },
        {
          edges: [
            { id: 1, s: 3, t: 1 }, // Invalid source
          ],
        },
      ]
      const result = validateCx2(cx)
      // Log the actual errors for debugging
      console.log('Validation errors:', JSON.stringify(result.errors, null, 2))

      // First check if we have any errors at all
      expect(result.errors.length).toBeGreaterThan(0)

      // Then check for specific error types
      const errorCodes = result.errors.map((e) => e.code)
      console.log('Error codes:', errorCodes)

      // Check for duplicate node ID
      expect(errorCodes).toContain('DUPLICATE_NODE_ID')

      // Check for invalid edge source
      expect(errorCodes).toContain('INVALID_EDGE_SOURCE')

      // Check for either attribute validation error
      expect(
        errorCodes.some(
          (code) =>
            code === 'INVALID_ATTRIBUTE_DECLARATIONS' ||
            code === 'INVALID_ATTRIBUTE_TYPE',
        ),
      ).toBe(true)
    })
  })
})
