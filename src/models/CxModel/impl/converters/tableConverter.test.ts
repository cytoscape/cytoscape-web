import { Cx2 } from '../../Cx2'
import { createTablesFromCx } from './tableConverter'

// to run these: npx jest src/models/CxModel/impl/converters/tableConverter.test.ts

describe('tableConverter', () => {
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

  describe('createTablesFromCx', () => {
    it('should create empty tables from minimal CX2', () => {
      const networkId = 'test-network-1'
      const cx2 = createMinimalValidCx()

      const [nodeTable, edgeTable] = createTablesFromCx(networkId, cx2)

      expect(nodeTable.id).toBe(`${networkId}-nodes`)
      expect(edgeTable.id).toBe(`${networkId}-edges`)
      expect(nodeTable.columns).toEqual([])
      expect(edgeTable.columns).toEqual([])
      expect(nodeTable.rows.size).toBe(0)
      expect(edgeTable.rows.size).toBe(0)
    })

    it('should create tables with columns from attribute declarations', () => {
      const networkId = 'test-network-2'
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
                interaction: { d: 'string' },
              },
              networkAttributes: {},
            },
          ],
        },
        {
          nodes: [{ id: 1 }],
        },
        {
          edges: [{ id: 1, s: 1, t: 1 }],
        },
        {
          status: [{ success: true }],
        },
      ]

      const [nodeTable, edgeTable] = createTablesFromCx(networkId, cx2)

      expect(nodeTable.columns.length).toBe(2)
      expect(nodeTable.columns.find(c => c.name === 'name')).toBeDefined()
      expect(nodeTable.columns.find(c => c.name === 'score')).toBeDefined()
      expect(nodeTable.columns.find(c => c.name === 'name')?.type).toBe('string')
      expect(nodeTable.columns.find(c => c.name === 'score')?.type).toBe('double')

      expect(edgeTable.columns.length).toBe(2)
      expect(edgeTable.columns.find(c => c.name === 'weight')).toBeDefined()
      expect(edgeTable.columns.find(c => c.name === 'interaction')).toBeDefined()
    })

    it('should create tables with node attributes', () => {
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

      const [nodeTable, edgeTable] = createTablesFromCx(networkId, cx2)

      expect(nodeTable.rows.size).toBe(2)
      const node1Row = nodeTable.rows.get('1')
      expect(node1Row).toBeDefined()
      if (node1Row) {
        expect(node1Row.name).toBe('Node1')
        expect(node1Row.score).toBe(0.5)
      }

      const node2Row = nodeTable.rows.get('2')
      expect(node2Row).toBeDefined()
      if (node2Row) {
        expect(node2Row.name).toBe('Node2')
        expect(node2Row.score).toBe(0.8)
      }
    })

    it('should create tables with edge attributes', () => {
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

      const [nodeTable, edgeTable] = createTablesFromCx(networkId, cx2)

      expect(edgeTable.rows.size).toBe(1)
      const edge1Row = edgeTable.rows.get('e1')
      expect(edge1Row).toBeDefined()
      if (edge1Row) {
        expect(edge1Row.weight).toBe(0.5)
        expect(edge1Row.interaction).toBe('activates')
      }
    })

    it('should handle attribute aliases', () => {
      const networkId = 'test-network-5'
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          attributeDeclarations: [
            {
              nodes: {
                name: { d: 'string', a: 'nodeName' },
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
                nodeName: 'Node1', // Using alias
                score: 0.5,
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

      const [nodeTable, edgeTable] = createTablesFromCx(networkId, cx2)

      const node1Row = nodeTable.rows.get('1')
      expect(node1Row).toBeDefined()
      if (node1Row) {
        expect(node1Row.name).toBe('Node1') // Should be translated to original name
        expect(node1Row.score).toBe(0.5)
      }
    })

    it('should handle default attribute values', () => {
      const networkId = 'test-network-6'
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          attributeDeclarations: [
            {
              nodes: {
                name: { d: 'string', v: 'Default Name' },
                score: { d: 'double', v: 0.0 },
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
                // score not provided, should use default
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

      const [nodeTable, edgeTable] = createTablesFromCx(networkId, cx2)

      const node1Row = nodeTable.rows.get('1')
      expect(node1Row).toBeDefined()
      if (node1Row) {
        expect(node1Row.name).toBe('Node1')
        expect(node1Row.score).toBe(0.0) // Should use default value
      }
    })

    it('should create empty rows for nodes without attributes', () => {
      const networkId = 'test-network-7'
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
          nodes: [
            { id: 1 },
            { id: 2 },
          ],
        },
        {
          edges: [],
        },
        {
          status: [{ success: true }],
        },
      ]

      const [nodeTable, edgeTable] = createTablesFromCx(networkId, cx2)

      expect(nodeTable.rows.size).toBe(2)
      expect(nodeTable.rows.get('1')).toEqual({})
      expect(nodeTable.rows.get('2')).toEqual({})
    })

    it('should create empty rows for edges without attributes', () => {
      const networkId = 'test-network-8'
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          attributeDeclarations: [
            {
              nodes: {},
              edges: {
                weight: { d: 'double' },
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
            { id: 1, s: 1, t: 2 },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const [nodeTable, edgeTable] = createTablesFromCx(networkId, cx2)

      expect(edgeTable.rows.size).toBe(1)
      expect(edgeTable.rows.get('e1')).toEqual({})
    })

    it('should sort columns alphabetically', () => {
      const networkId = 'test-network-9'
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          attributeDeclarations: [
            {
              nodes: {
                zeta: { d: 'string' },
                alpha: { d: 'string' },
                beta: { d: 'string' },
              },
              edges: {},
              networkAttributes: {},
            },
          ],
        },
        {
          nodes: [{ id: 1 }],
        },
        {
          edges: [],
        },
        {
          status: [{ success: true }],
        },
      ]

      const [nodeTable, edgeTable] = createTablesFromCx(networkId, cx2)

      expect(nodeTable.columns.map(c => c.name)).toEqual(['alpha', 'beta', 'zeta'])
    })

    it('should handle nodes and edges with no attribute declarations', () => {
      const networkId = 'test-network-10'
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

      const [nodeTable, edgeTable] = createTablesFromCx(networkId, cx2)

      expect(nodeTable.columns).toEqual([])
      expect(edgeTable.columns).toEqual([])
      expect(nodeTable.rows.size).toBe(2)
      expect(edgeTable.rows.size).toBe(1)
    })
  })
})

