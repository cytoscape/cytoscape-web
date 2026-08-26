// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { makeCx2, cx2Pool, cloneCx2, makeCyModels } from './fixture.mjs'

const SMALL = { nodes: 20, edges: 30 }

describe('makeCx2', () => {
  it('is deterministic: same options, deep-equal document', () => {
    expect(cloneCx2(makeCx2(SMALL))).toEqual(cloneCx2(makeCx2(SMALL)))
  })

  it('caches per option set: same object back', () => {
    expect(makeCx2(SMALL)).toBe(makeCx2(SMALL))
    expect(makeCx2(SMALL)).not.toBe(makeCx2({ nodes: 21, edges: 30 }))
  })

  it('sizes the document and keeps status last', () => {
    const cx2 = makeCx2(SMALL) as any[]
    const nodes = cx2.find((a) => a.nodes)?.nodes
    const edges = cx2.find((a) => a.edges)?.edges

    expect(nodes).toHaveLength(20)
    expect(edges).toHaveLength(30)
    expect(cx2[cx2.length - 1].status).toBeDefined()
  })
})

describe('cx2Pool', () => {
  it('returns k structurally identical documents with distinct identity', () => {
    const pool = cx2Pool(3, SMALL)

    expect(pool).toHaveLength(3)
    expect(pool[0]).toEqual(pool[1])
    expect(pool[0]).not.toBe(pool[1])
    // deep distinctness: mutating one member must not leak into another
    ;(pool[0] as any[]).find((a) => a.nodes).nodes[0].v.n = 'mutated'
    expect((pool[1] as any[]).find((a) => a.nodes).nodes[0].v.n).not.toBe(
      'mutated',
    )
  })
})

describe('makeCyModels', () => {
  it('converts once per option set and exposes the CyNetwork shape', () => {
    const models = makeCyModels(SMALL) as any

    expect(makeCyModels(SMALL)).toBe(models)
    expect(models.network.nodes).toHaveLength(20)
    expect(models.nodeTable.rows.size).toBe(20)
    expect(models.visualStyle).toBeDefined()
    expect(models.networkViews).toHaveLength(1)
  })
})
