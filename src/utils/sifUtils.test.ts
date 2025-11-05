import { validateSif } from './sifUtils'
import { parseSif } from './sifUtils'

describe('validateSif', () => {
  it('valid SIF with spaces as delimiter', () => {
    const sif = `nodeA type1 nodeB\nnodeB type2 nodeC nodeD\nnodeE`
    const result = validateSif(sif)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
  })

  it('valid SIF with tabs as delimiter and spaces in names', () => {
    const sif = `node A\ttype1\tnode B\nnode B\ttype2\tnode C\tnode D\nnode E`
    const result = validateSif(sif)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
  })

  it('errors on line with only two tokens', () => {
    const sif = `nodeA type1`
    const result = validateSif(sif)
    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.code === 'INVALID_LINE_FORMAT')).toBe(
      true,
    )
  })

  it('errors on empty node name', () => {
    const sif = ` type1 nodeB`
    const result = validateSif(sif)
    expect(result.isValid).toBe(false)
    expect(
      result.errors.some(
        (e) => e.code === 'EMPTY_SOURCE_NODE' || e.code === 'EMPTY_NODE_NAME',
      ),
    ).toBe(true)
  })

  it('errors on empty edge type', () => {
    const sif = `nodeA  nodeB`
    const result = validateSif(sif)
    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.code === 'EMPTY_EDGE_TYPE')).toBe(true)
  })

  it('errors on empty target node', () => {
    const sif = `nodeA type1 `
    const result = validateSif(sif)
    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.code === 'EMPTY_TARGET_NODE')).toBe(true)
  })

  it('warns about duplicate node (single node line)', () => {
    const sif = `nodeA\nnodeA`
    const result = validateSif(sif)
    expect(result.isValid).toBe(true)
    expect(result.warnings.some((w) => w.code === 'DUPLICATE_NODE')).toBe(true)
  })

  it('warns about duplicate edge', () => {
    const sif = `nodeA type1 nodeB\nnodeA type1 nodeB`
    const result = validateSif(sif)
    expect(result.isValid).toBe(true)
    expect(result.warnings.some((w) => w.code === 'DUPLICATE_EDGE')).toBe(true)
  })

  it('valid self-edge', () => {
    const sif = `nodeA type1 nodeA`
    const result = validateSif(sif)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
  })

  it('valid: multiple edges of different types between same nodes', () => {
    const sif = `nodeA type1 nodeB\nnodeA type2 nodeB`
    const result = validateSif(sif)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
  })
})

describe('parseSif', () => {
  it('parses a single edge', () => {
    const sif = 'nodeA type1 nodeB'
    const { nodeNames, edges } = parseSif(sif)
    expect(nodeNames).toEqual(['nodeA', 'nodeB'])
    expect(edges).toHaveLength(1)
    expect(edges[0]).toMatchObject({
      sourceName: 'nodeA',
      interaction: 'type1',
      targetName: 'nodeB',
    })
  })

  it('parses multiple targets on one line', () => {
    const sif = 'nodeA type1 nodeB nodeC nodeD'
    const { nodeNames, edges } = parseSif(sif)
    expect(nodeNames).toEqual(['nodeA', 'nodeB', 'nodeC', 'nodeD'])
    expect(edges).toHaveLength(3)
    expect(edges.map((e) => e.targetName).sort()).toEqual([
      'nodeB',
      'nodeC',
      'nodeD',
    ])
  })

  it('parses an orphan node', () => {
    const sif = 'nodeA'
    const { nodeNames, edges } = parseSif(sif)
    expect(nodeNames).toEqual(['nodeA'])
    expect(edges).toHaveLength(0)
  })

  it('parses edges and orphan node', () => {
    const sif = 'nodeA type1 nodeB\nnodeC'
    const { nodeNames, edges } = parseSif(sif)
    expect(nodeNames).toEqual(['nodeA', 'nodeB', 'nodeC'])
    expect(edges).toHaveLength(1)
    expect(edges[0]).toMatchObject({ sourceName: 'nodeA', targetName: 'nodeB' })
  })

  it('handles node as both orphan and in edge', () => {
    const sif = 'nodeA type1 nodeB\nnodeB'
    const { nodeNames, edges } = parseSif(sif)
    expect(nodeNames).toEqual(['nodeA', 'nodeB'])
    expect(edges).toHaveLength(1)
  })

  it('parses multiple edges, multiple lines', () => {
    const sif = 'nodeA type1 nodeB\nnodeA type2 nodeC\nnodeD'
    const { nodeNames, edges } = parseSif(sif)
    expect(nodeNames).toEqual(['nodeA', 'nodeB', 'nodeC', 'nodeD'])
    expect(edges).toHaveLength(2)
    expect(edges.map((e) => e.interaction).sort()).toEqual(['type1', 'type2'])
  })

  it('parses self-edge', () => {
    const sif = 'nodeA type1 nodeA'
    const { nodeNames, edges } = parseSif(sif)
    expect(nodeNames).toEqual(['nodeA'])
    expect(edges).toHaveLength(1)
    expect(edges[0]).toMatchObject({ sourceName: 'nodeA', targetName: 'nodeA' })
  })

  it('includes duplicate edges', () => {
    const sif = 'nodeA type1 nodeB\nnodeA type1 nodeB'
    const { nodeNames, edges } = parseSif(sif)
    expect(nodeNames).toEqual(['nodeA', 'nodeB'])
    expect(edges).toHaveLength(2)
  })

  it('handles whitespace robustness', () => {
    const sif = '  nodeA   type1   nodeB   \nnodeC'
    const { nodeNames, edges } = parseSif(sif)
    expect(nodeNames).toEqual(['nodeA', 'nodeB', 'nodeC'])
    expect(edges).toHaveLength(1)
    expect(edges[0]).toMatchObject({ sourceName: 'nodeA', targetName: 'nodeB' })
  })
})
