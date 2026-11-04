// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { readSelectionFromSearch } from './readSelectionFromSearch'

describe('readSelectionFromSearch', () => {
  it('reads both selections from a full app deep link', () => {
    expect(
      readSelectionFromSearch(
        '?filterEnabled=true&activeNetworkView=885f_134&selectednodes=134&selectedSubnetworkNodes=482',
      ),
    ).toEqual({ nodeIds: ['134'], subnetworkNodeIds: ['482'] })
  })

  it('splits space-separated ids, encoded as + or %20', () => {
    expect(
      readSelectionFromSearch(
        '?selectednodes=1+2%203&selectedSubnetworkNodes=',
      ),
    ).toEqual({ nodeIds: ['1', '2', '3'], subnetworkNodeIds: [] })
  })

  it('returns empty selections when the parameters are absent', () => {
    expect(readSelectionFromSearch('')).toEqual({
      nodeIds: [],
      subnetworkNodeIds: [],
    })
  })
})
