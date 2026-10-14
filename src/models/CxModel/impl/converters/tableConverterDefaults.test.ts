// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { createTablesFromCx } from './tableConverter'
import { Cx2 } from '../../Cx2'

describe('tableConverter defaults', () => {
  it('should apply default values for missing and empty v on nodes', () => {
    const networkId = 'test-network-defaults-nodes'
    const cx2: Cx2 = [
      { CXVersion: '2.0' },
      {
        attributeDeclarations: [
          {
            nodes: {
              testAttr: { d: 'string', v: 'default-value' },
            },
          } as any,
        ],
      },
      {
        nodes: [
          { id: 0 }, // no v
          { id: 1, v: {} }, // empty v
          { id: 2, v: { testAttr: 'custom' } }, // custom v
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

    expect(nodeTable.rows.get('0')).toEqual({ testAttr: 'default-value' })
    expect(nodeTable.rows.get('1')).toEqual({ testAttr: 'default-value' })
    expect(nodeTable.rows.get('2')).toEqual({ testAttr: 'custom' })
  })

  it('should apply default values for missing and empty v on edges', () => {
    const networkId = 'test-network-defaults-edges'
    const cx2: Cx2 = [
      { CXVersion: '2.0' },
      {
        attributeDeclarations: [
          {
            edges: {
              edgeAttr: { d: 'integer', v: 42 },
            },
          } as any,
        ],
      },
      {
        nodes: [{ id: 0 }, { id: 1 }],
      },
      {
        edges: [
          { id: 0, s: 0, t: 1 }, // no v
          { id: 1, s: 0, t: 1, v: {} }, // empty v
          { id: 2, s: 0, t: 1, v: { edgeAttr: 99 } }, // custom v
        ],
      },
      {
        status: [{ success: true }],
      },
    ]

    const [, edgeTable] = createTablesFromCx(networkId, cx2)

    // Remember that edge IDs are translated with an 'e' prefix
    expect(edgeTable.rows.get('e0')).toEqual({ edgeAttr: 42 })
    expect(edgeTable.rows.get('e1')).toEqual({ edgeAttr: 42 })
    expect(edgeTable.rows.get('e2')).toEqual({ edgeAttr: 99 })
  })

  it('should initialize with empty objects when no defaults exist', () => {
    const networkId = 'test-network-no-defaults'
    const cx2: Cx2 = [
      { CXVersion: '2.0' },
      {
        attributeDeclarations: [
          {
            nodes: {
              testAttr: { d: 'string' }, // no 'v' provided
            },
            edges: {
              edgeAttr: { d: 'integer' }, // no 'v' provided
            },
          } as any,
        ],
      },
      {
        nodes: [{ id: 0 }, { id: 1, v: {} }],
      },
      {
        edges: [
          { id: 0, s: 0, t: 1 },
          { id: 1, s: 0, t: 1, v: {} },
        ],
      },
      {
        status: [{ success: true }],
      },
    ]

    const [nodeTable, edgeTable] = createTablesFromCx(networkId, cx2)

    expect(nodeTable.rows.get('0')).toEqual({})
    expect(nodeTable.rows.get('1')).toEqual({})
    expect(edgeTable.rows.get('e0')).toEqual({})
    expect(edgeTable.rows.get('e1')).toEqual({})
  })
})
