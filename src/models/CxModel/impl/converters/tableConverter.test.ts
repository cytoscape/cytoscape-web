// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { Cx2 } from '../../Cx2'
import { createTablesFromCx } from './tableConverter'

// REVIEW.md R2-19: CX2 that PASSES validateCX2 used to crash the table
// converter — an empty attributeDeclarations aspect array made attrDefs
// undefined, and a declaration object without nodes/edges keys crashed the
// row loops (the guards only protected the column loops).
describe('malformed attributeDeclarations (regression: R2-19)', () => {
  it('handles an empty attributeDeclarations aspect array', () => {
    const cx2: Cx2 = [
      { CXVersion: '2.0' },
      { attributeDeclarations: [] },
      { nodes: [{ id: 1, v: { name: 'node a' } }] },
      { status: [{ success: true }] },
    ] as Cx2

    let tables: any
    expect(() => {
      tables = createTablesFromCx('net-1', cx2)
    }).not.toThrow()
    const [nodeTable] = tables
    expect(nodeTable.rows.size).toBe(1)
  })

  it('handles a declaration object with no nodes/edges keys when elements carry attributes', () => {
    const cx2: Cx2 = [
      { CXVersion: '2.0' },
      { attributeDeclarations: [{}] },
      { nodes: [{ id: 1, v: { name: 'node a' } }] },
      { edges: [{ id: 1, s: 1, t: 1, v: { weight: 2 } }] },
      { status: [{ success: true }] },
    ] as Cx2

    let tables: any
    expect(() => {
      tables = createTablesFromCx('net-1', cx2)
    }).not.toThrow()
    const [nodeTable, edgeTable] = tables
    expect(nodeTable.rows.size).toBe(1)
    expect(edgeTable.rows.size).toBe(1)
  })
})

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

    // CW-651: a network authored with node data but a partial attribute
    // declaration (no `edges` key) must not throw when building the edge rows.
    it('does not throw when attribute declarations omit the edges key', () => {
      const networkId = 'test-network-partial'
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          attributeDeclarations: [
            {
              nodes: { name: { d: 'string' } },
            },
          ],
        },
        { nodes: [{ id: 0, v: { name: 'a' } }] },
        {
          edges: [{ id: 0, s: 0, t: 0, v: { weight: 1 } }],
        },
        { status: [{ success: true }] },
      ]

      expect(() => createTablesFromCx(networkId, cx2)).not.toThrow()
      const [nodeTable] = createTablesFromCx(networkId, cx2)
      expect(nodeTable.rows.get('0')?.name).toBe('a')
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
      expect(nodeTable.columns.find((c) => c.name === 'name')).toBeDefined()
      expect(nodeTable.columns.find((c) => c.name === 'score')).toBeDefined()
      expect(nodeTable.columns.find((c) => c.name === 'name')?.type).toBe(
        'string',
      )
      expect(nodeTable.columns.find((c) => c.name === 'score')?.type).toBe(
        'double',
      )

      expect(edgeTable.columns.length).toBe(2)
      expect(edgeTable.columns.find((c) => c.name === 'weight')).toBeDefined()
      expect(
        edgeTable.columns.find((c) => c.name === 'interaction'),
      ).toBeDefined()
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

      const [nodeTable] = createTablesFromCx(networkId, cx2)

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
          nodes: [{ id: 1 }, { id: 2 }],
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

      const [, edgeTable] = createTablesFromCx(networkId, cx2)

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

      const [nodeTable] = createTablesFromCx(networkId, cx2)

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

      const [nodeTable] = createTablesFromCx(networkId, cx2)

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
          nodes: [{ id: 1 }, { id: 2 }],
        },
        {
          edges: [],
        },
        {
          status: [{ success: true }],
        },
      ]

      const [nodeTable] = createTablesFromCx(networkId, cx2)

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
          nodes: [{ id: 1 }, { id: 2 }],
        },
        {
          edges: [{ id: 1, s: 1, t: 2 }],
        },
        {
          status: [{ success: true }],
        },
      ]

      const [, edgeTable] = createTablesFromCx(networkId, cx2)

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

      const [nodeTable] = createTablesFromCx(networkId, cx2)

      expect(nodeTable.columns.map((c) => c.name)).toEqual([
        'alpha',
        'beta',
        'zeta',
      ])
    })

    // Regression: CW-650. A CX2 network from NDEx may contain an edge whose
    // `v` is an empty object ({}), while the attributeDeclarations aspect is
    // present but omits the `edges` key entirely. Previously this threw
    // "Cannot convert undefined or null to object" via Object.entries(undefined)
    // inside the edge row-building loop.
    it('should not throw when an edge has an empty v:{} and edges decl is absent', () => {
      const networkId = 'test-network-cw650'
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          attributeDeclarations: [
            {
              // Note: no `edges` key at all (matches NDEx output for CW-650)
              nodes: {},
              networkAttributes: {},
            } as any,
          ],
        },
        {
          nodes: [{ id: 0 }, { id: 1 }],
        },
        {
          edges: [{ id: 0, s: 0, t: 1, v: {} }],
        },
        {
          status: [{ success: true }],
        },
      ]

      let result: ReturnType<typeof createTablesFromCx> | undefined
      expect(() => {
        result = createTablesFromCx(networkId, cx2)
      }).not.toThrow()

      const [, edgeTable] = result!
      // The empty v:{} edge should produce an empty row, not a crash
      expect(edgeTable.rows.size).toBe(1)
      expect(edgeTable.rows.get('e0')).toEqual({})
      expect(edgeTable.columns).toEqual([])
    })

    it('should not throw when a node has an empty v:{} and nodes decl is absent', () => {
      const networkId = 'test-network-cw650-node'
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          attributeDeclarations: [
            {
              // No `nodes` key
              edges: {},
              networkAttributes: {},
            } as any,
          ],
        },
        {
          nodes: [{ id: 0, v: {} }, { id: 1 }],
        },
        {
          edges: [],
        },
        {
          status: [{ success: true }],
        },
      ]

      let result: ReturnType<typeof createTablesFromCx> | undefined
      expect(() => {
        result = createTablesFromCx(networkId, cx2)
      }).not.toThrow()

      const [nodeTable] = result!
      expect(nodeTable.rows.size).toBe(2)
      expect(nodeTable.rows.get('0')).toEqual({})
      expect(nodeTable.rows.get('1')).toEqual({})
    })

    it('should handle nodes and edges with no attribute declarations', () => {
      const networkId = 'test-network-10'
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          nodes: [{ id: 1 }, { id: 2 }],
        },
        {
          edges: [{ id: 1, s: 1, t: 2 }],
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
