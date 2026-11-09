// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { Cx2 } from '../Cx2'
import { createCyNetworkFromCx2, getCyNetworkFromCx2 } from './converter'

type Declarations = Record<string, { d?: string; a?: string; v?: unknown }>

interface Fixture {
  nodes?: Declarations
  edges?: Declarations
  nodeElements?: Array<Record<string, unknown>>
  edgeElements?: Array<Record<string, unknown>>
  aspects?: Array<Record<string, unknown>>
}

const buildCx = ({
  nodes = {},
  edges = {},
  nodeElements = [{ id: 1, x: 0, y: 0, v: {} }],
  edgeElements = [],
  aspects = [],
}: Fixture): Cx2 =>
  [
    { CXVersion: '2.0', hasFragments: false },
    { metaData: [] },
    { attributeDeclarations: [{ nodes, edges }] },
    { nodes: nodeElements },
    { edges: edgeElements },
    ...aspects,
    { status: [{ error: '', success: true }] },
  ] as unknown as Cx2

const convert = (fixture: Fixture) =>
  createCyNetworkFromCx2('net', buildCx(fixture))

const passthrough = (attribute: string) => ({
  type: 'PASSTHROUGH',
  definition: { attribute, type: 'string' },
})

describe('merging duplicate CX2 columns (#951)', () => {
  it('keeps the first declared spelling and type', () => {
    const { nodeTable } = convert({
      nodes: { name: { d: 'string' }, Name: { d: 'string' } },
    })

    expect(nodeTable.columns).toEqual([{ name: 'name', type: 'string' }])
  })

  it('merges edge columns too', () => {
    const { edgeTable } = convert({
      edges: { Weight: { d: 'double' }, weight: { d: 'double' } },
      edgeElements: [{ id: 0, s: 1, t: 1, v: { weight: 2.5 } }],
    })

    expect(edgeTable.columns).toEqual([{ name: 'Weight', type: 'double' }])
    expect(edgeTable.rows.get('e0')).toEqual({ Weight: 2.5 })
  })

  it('takes the last value in the order of the v object, not of the declarations', () => {
    const { nodeTable } = convert({
      nodes: { name: { d: 'string' }, Name: { d: 'string' } },
      nodeElements: [
        { id: 1, x: 0, y: 0, v: { name: 'a', Name: 'b' } },
        { id: 2, x: 0, y: 0, v: { Name: 'b', name: 'a' } },
      ],
    })

    expect(nodeTable.rows.get('1')).toEqual({ name: 'b' })
    expect(nodeTable.rows.get('2')).toEqual({ name: 'a' })
  })

  it('keeps the value of a row that has only one of the spellings', () => {
    const { nodeTable } = convert({
      nodes: { name: { d: 'string' }, Name: { d: 'string' } },
      nodeElements: [
        { id: 1, x: 0, y: 0, v: { name: 'first' } },
        { id: 2, x: 0, y: 0, v: { Name: 'second' } },
      ],
    })

    expect(nodeTable.rows.get('1')).toEqual({ name: 'first' })
    expect(nodeTable.rows.get('2')).toEqual({ name: 'second' })
  })

  it('resolves aliases in the v object before merging', () => {
    const { nodeTable } = convert({
      nodes: { name: { d: 'string', a: 'n' }, Name: { d: 'string', a: 'N' } },
      nodeElements: [{ id: 1, x: 0, y: 0, v: { n: 'a', N: 'b' } }],
    })

    expect(nodeTable.rows.get('1')).toEqual({ name: 'b' })
  })

  it('keeps a merged value when another column uses its name as an alias', () => {
    const { nodeTable } = convert({
      nodes: {
        n: { d: 'string', a: 'a' },
        N: { d: 'string', a: 'b' },
        name: { d: 'string', a: 'n' },
      },
      nodeElements: [
        { id: 1, x: 0, y: 0, v: { a: 'first', b: 'last', n: 'label' } },
      ],
    })

    expect(nodeTable.rows.get('1')).toEqual({ n: 'last', name: 'label' })
  })

  it('uses a default only for a row with no value under any spelling', () => {
    const { nodeTable } = convert({
      nodes: { name: { d: 'string', v: 'x' }, Name: { d: 'string', v: 'y' } },
      nodeElements: [
        { id: 1, x: 0, y: 0, v: { name: 'kept' } },
        { id: 2, x: 0, y: 0, v: {} },
      ],
    })

    expect(nodeTable.rows.get('1')).toEqual({ name: 'kept' })
    // The last declared default, as Desktop applies them in declaration order
    expect(nodeTable.rows.get('2')).toEqual({ name: 'y' })
  })

  describe('declared types that differ', () => {
    it('fails when a value is written to the other type', () => {
      expect(() =>
        convert({
          nodes: { score: { d: 'string' }, Score: { d: 'integer' } },
          nodeElements: [{ id: 1, x: 0, y: 0, v: { Score: 5 } }],
        }),
      ).toThrow(/Score.*score/)
    })

    it('does not fail for a differently typed column with no values', () => {
      const { nodeTable } = convert({
        nodes: { score: { d: 'string' }, Score: { d: 'integer' } },
        nodeElements: [{ id: 1, x: 0, y: 0, v: { score: 'high' } }],
      })

      expect(nodeTable.columns).toEqual([{ name: 'score', type: 'string' }])
      expect(nodeTable.rows.get('1')).toEqual({ score: 'high' })
    })

    it('does not fail for a null value, which Desktop never type-checks', () => {
      expect(() =>
        convert({
          nodes: { score: { d: 'string' }, Score: { d: 'integer' } },
          nodeElements: [{ id: 1, x: 0, y: 0, v: { Score: null } }],
        }),
      ).not.toThrow()
    })

    it('fails when a default of the other type would be written', () => {
      expect(() =>
        convert({
          nodes: { score: { d: 'string' }, Score: { d: 'integer', v: 1 } },
          nodeElements: [{ id: 1, x: 0, y: 0, v: {} }],
        }),
      ).toThrow(/Score.*score/)
    })

    it('treats integer and long as different types', () => {
      expect(() =>
        convert({
          nodes: { count: { d: 'integer' }, Count: { d: 'long' } },
          nodeElements: [{ id: 1, x: 0, y: 0, v: { Count: 5 } }],
        }),
      ).toThrow(/Count.*count/)
    })

    it('rejects through getCyNetworkFromCx2 without returning a network', () => {
      const cx = buildCx({
        nodes: { score: { d: 'string' }, Score: { d: 'integer' } },
        nodeElements: [{ id: 1, x: 0, y: 0, v: { Score: 5 } }],
      })

      expect(() => getCyNetworkFromCx2('net', cx)).toThrow(/Score.*score/)
    })
  })

  describe('references to a merged-away spelling', () => {
    const nodes: Declarations = {
      name: { d: 'string' },
      Name: { d: 'string' },
    }

    it('follows the kept column in a visual style mapping', () => {
      const { visualStyle } = convert({
        nodes,
        aspects: [
          {
            visualProperties: [
              {
                default: { node: {}, edge: {}, network: {} },
                nodeMapping: { NODE_LABEL: passthrough('Name') },
                edgeMapping: {},
              },
            ],
          },
        ],
      })

      expect(visualStyle.nodeLabel.mapping?.attribute).toBe('name')
    })

    it('follows the kept column in every named style set', () => {
      const style = (id: string, attribute: string) => ({
        id,
        name: id,
        visualProperties: {
          default: { node: {}, edge: {}, network: {} },
          nodeMapping: { NODE_LABEL: passthrough(attribute) },
          edgeMapping: {},
        },
      })
      const { visualStyleSet } = convert({
        nodes,
        aspects: [
          {
            cyWebVisualStyles: [
              {
                version: '1.0',
                activeStyleId: 'a',
                styles: [style('a', 'name'), style('b', 'Name')],
              },
            ],
          },
        ],
      })

      const other = visualStyleSet?.styles['b']
      expect(other?.visualStyle.nodeLabel.mapping?.attribute).toBe('name')
    })

    it('follows the kept column in the table display configuration, once', () => {
      const { visualStyleOptions } = convert({
        nodes,
        aspects: [
          {
            visualEditorProperties: [
              {
                properties: {
                  nodeSizeLocked: false,
                  arrowColorMatchesEdge: false,
                  tableDisplayConfiguration: {
                    nodeTable: {
                      columnConfiguration: [
                        { attributeName: 'Name', visible: false },
                        { attributeName: 'name', visible: true },
                      ],
                      sortColumn: 'Name',
                    },
                    edgeTable: { columnConfiguration: [] },
                  },
                },
              },
            ],
          },
        ],
      })

      const config =
        visualStyleOptions?.visualEditorProperties.tableDisplayConfiguration
          .nodeTable
      expect(config?.columnConfiguration).toEqual([
        { attributeName: 'name', visible: false },
      ])
      expect(config?.sortColumn).toBe('name')
    })

    it('follows the kept column in a hierarchy filter widget', () => {
      const { otherAspects } = convert({
        edges: { interaction: { d: 'string' }, Interaction: { d: 'string' } },
        aspects: [
          {
            filterWidgets: [
              {
                widgetType: 'checkboxes',
                appliesTo: 'edges',
                attributeName: 'Interaction',
                filter: [],
              },
            ],
          },
        ],
      })

      const aspect = otherAspects?.find((a) => 'filterWidgets' in a) as any
      expect(aspect.filterWidgets[0].attributeName).toBe('interaction')
    })

    it.each(['Nodes', ' node ', 'NODE'])(
      'reads the node table for a filter widget that applies to %j',
      (appliesTo) => {
        const { otherAspects } = convert({
          nodes,
          edges: { Name: { d: 'string' }, name: { d: 'string' } },
          aspects: [
            {
              filterWidgets: [{ appliesTo, attributeName: 'Name', filter: [] }],
            },
          ],
        })

        const aspect = otherAspects?.find((a) => 'filterWidgets' in a) as any
        expect(aspect.filterWidgets[0].attributeName).toBe('name')
      },
    )

    it('leaves a filter widget of an unknown kind alone', () => {
      const { otherAspects } = convert({
        edges: { Name: { d: 'string' }, name: { d: 'string' } },
        aspects: [
          {
            filterWidgets: [
              { appliesTo: 'network', attributeName: 'name', filter: [] },
            ],
          },
        ],
      })

      const aspect = otherAspects?.find((a) => 'filterWidgets' in a) as any
      expect(aspect.filterWidgets[0].attributeName).toBe('name')
    })

    it('leaves a mapping on an unrelated column alone', () => {
      const { visualStyle } = convert({
        nodes: { ...nodes, score: { d: 'string' } },
        aspects: [
          {
            visualProperties: [
              {
                default: { node: {}, edge: {}, network: {} },
                nodeMapping: { NODE_LABEL: passthrough('score') },
                edgeMapping: {},
              },
            ],
          },
        ],
      })

      expect(visualStyle.nodeLabel.mapping?.attribute).toBe('score')
    })
  })

  describe('id columns', () => {
    it('still imports an attribute named id as a column', () => {
      const { nodeTable } = convert({
        nodes: { id: { d: 'string' } },
        nodeElements: [{ id: 1, x: 0, y: 0, v: { id: 'own' } }],
      })

      expect(nodeTable.columns).toEqual([{ name: 'id', type: 'string' }])
      expect(nodeTable.rows.get('1')).toEqual({ id: 'own' })
    })

    it('merges id and ID like any other duplicate', () => {
      const { nodeTable } = convert({
        nodes: { id: { d: 'string' }, ID: { d: 'string' } },
        nodeElements: [
          { id: 1, x: 0, y: 0, v: { id: 'a', ID: 'b' } },
          { id: 2, x: 0, y: 0, v: { id: 'only' } },
        ],
      })

      expect(nodeTable.columns).toEqual([{ name: 'id', type: 'string' }])
      expect(nodeTable.rows.get('1')).toEqual({ id: 'b' })
      expect(nodeTable.rows.get('2')).toEqual({ id: 'only' })
    })

    it('fails for id and ID of different types', () => {
      expect(() =>
        convert({
          nodes: { id: { d: 'string' }, ID: { d: 'long' } },
          nodeElements: [{ id: 1, x: 0, y: 0, v: { ID: 7 } }],
        }),
      ).toThrow(/ID.*id/)
    })
  })

  describe('prototype boundary', () => {
    // JSON.parse creates an own `__proto__` key; a literal would not
    const parse = (json: string) => JSON.parse(json) as Declarations

    it('merges __proto__ spellings without touching any prototype', () => {
      const { nodeTable } = convert({
        nodes: parse('{"__proto__":{"d":"string"},"__PROTO__":{"d":"string"}}'),
        nodeElements: [
          {
            id: 1,
            x: 0,
            y: 0,
            v: JSON.parse('{"__proto__":"a","__PROTO__":"b"}'),
          },
        ],
      })

      expect(nodeTable.columns).toEqual([{ name: '__proto__', type: 'string' }])
      const row = nodeTable.rows.get('1')
      expect(
        row && Object.getOwnPropertyDescriptor(row, '__proto__')?.value,
      ).toBe('b')
      expect(row && Object.getPrototypeOf(row)).toBe(Object.prototype)
      expect(({} as Record<string, unknown>).a).toBeUndefined()
    })

    it('merges constructor spellings onto a real own key', () => {
      const { nodeTable } = convert({
        nodes: {
          constructor: { d: 'string' },
          Constructor: { d: 'string' },
        } as unknown as Declarations,
        nodeElements: [
          { id: 1, x: 0, y: 0, v: { constructor: 'a', Constructor: 'b' } },
        ],
      })

      expect(nodeTable.columns).toEqual([
        { name: 'constructor', type: 'string' },
      ])
      expect(nodeTable.rows.get('1')).toEqual({ constructor: 'b' })
    })

    it('reads an attribute named constructor without any duplicate', () => {
      const { nodeTable } = convert({
        nodes: { constructor: { d: 'string' } } as unknown as Declarations,
        nodeElements: [{ id: 1, x: 0, y: 0, v: { constructor: 'own' } }],
      })

      expect(nodeTable.rows.get('1')).toEqual({ constructor: 'own' })
    })
  })

  describe('documents and networks left alone', () => {
    it('returns the same values for a document with no duplicates', () => {
      const { nodeTable } = convert({
        nodes: { name: { d: 'string' }, score: { d: 'double' } },
        nodeElements: [{ id: 1, x: 0, y: 0, v: { name: 'a', score: 1.5 } }],
      })

      expect(nodeTable.columns).toEqual([
        { name: 'name', type: 'string' },
        { name: 'score', type: 'double' },
      ])
      expect(nodeTable.rows.get('1')).toEqual({ name: 'a', score: 1.5 })
    })

    it('does not modify the document it was given', () => {
      const cx = buildCx({
        nodes: { name: { d: 'string' }, Name: { d: 'string' } },
        nodeElements: [{ id: 1, x: 0, y: 0, v: { name: 'a', Name: 'b' } }],
      })
      const before = JSON.stringify(cx)

      createCyNetworkFromCx2('net', cx)

      expect(JSON.stringify(cx)).toBe(before)
    })

    it('keeps saved duplicates when asked to load unchanged', () => {
      const cx = buildCx({
        nodes: { name: { d: 'string' }, Name: { d: 'integer' } },
        nodeElements: [{ id: 1, x: 0, y: 0, v: { name: 'a', Name: 5 } }],
      })

      const { nodeTable } = createCyNetworkFromCx2('net', cx, {
        keepDuplicateColumns: true,
      })

      expect(nodeTable.columns).toHaveLength(2)
      expect(nodeTable.rows.get('1')).toEqual({ name: 'a', Name: 5 })
    })
  })
})
