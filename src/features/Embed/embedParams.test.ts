import { describe, expect, it } from 'vitest'

import { readEmbedParams } from './embedParams'

describe('readEmbedParams', () => {
  it('reads the selections of a full-app deep link', () => {
    expect(
      readEmbedParams(
        '?filterEnabled=true&activeNetworkView=885f_134&selectednodes=134&selectedSubnetworkNodes=482',
      ),
    ).toEqual({
      selectedNodes: ['134'],
      selectedEdges: [],
      selectedSubnetworkNodes: ['482'],
    })
  })

  it('splits space-separated ids, encoded as + or %20', () => {
    expect(
      readEmbedParams('?selectednodes=1+2%203&selectededges=e1').selectedNodes,
    ).toEqual(['1', '2', '3'])
    expect(readEmbedParams('?selectededges=e1+e2').selectedEdges).toEqual([
      'e1',
      'e2',
    ])
  })

  it('reads the network view tab, ignoring a value that is not an index', () => {
    expect(readEmbedParams('?activeNetworkViewTab=0').networkViewTab).toBe(0)
    expect(readEmbedParams('?activeNetworkViewTab=1').networkViewTab).toBe(1)
    expect(
      readEmbedParams('?activeNetworkViewTab=x').networkViewTab,
    ).toBeUndefined()
    expect(
      readEmbedParams('?activeNetworkViewTab=-1').networkViewTab,
    ).toBeUndefined()
    expect(
      readEmbedParams('?activeNetworkViewTab=1.5').networkViewTab,
    ).toBeUndefined()
    expect(
      readEmbedParams('?activeNetworkViewTab=').networkViewTab,
    ).toBeUndefined()
  })

  it('reads the access key, ignoring an empty one', () => {
    expect(readEmbedParams('?accesskey=k1').accessKey).toBe('k1')
    expect(readEmbedParams('?accesskey=').accessKey).toBeUndefined()
  })

  it('returns empty selections when the parameters are absent', () => {
    expect(readEmbedParams('')).toEqual({
      selectedNodes: [],
      selectedEdges: [],
      selectedSubnetworkNodes: [],
    })
  })
})
