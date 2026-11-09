import { describe, expect, it } from 'vitest'

import { embedLinkOutUrl } from './embedLinkOut'
import { readEmbedParams } from './embedParams'

const ORIGIN = 'https://web.cytoscape.org'
const NET = 'net-1'

const queryOf = (url: string): URLSearchParams => new URL(url).searchParams

describe('embedLinkOutUrl', () => {
  it('opens the network in the editor', () => {
    expect(embedLinkOutUrl(ORIGIN, '/', NET)).toBe(
      'https://web.cytoscape.org/0/networks/net-1',
    )
    expect(embedLinkOutUrl(ORIGIN, '/cytoscape/', NET)).toBe(
      'https://web.cytoscape.org/cytoscape/0/networks/net-1',
    )
  })

  it('carries the selection of a plain network', () => {
    const query = queryOf(
      embedLinkOutUrl(ORIGIN, '/', NET, {
        selectedNodes: ['1', '2'],
        selectedEdges: ['e1'],
      }),
    )
    expect(query.get('selectednodes')).toBe('1 2')
    expect(query.get('selectededges')).toBe('e1')
    expect(query.has('activeNetworkView')).toBe(false)
  })

  it('carries the subsystem, its interaction network selection and the tab', () => {
    const query = queryOf(
      embedLinkOutUrl(ORIGIN, '/', NET, {
        subsystemId: '74',
        subnetworkNodeIds: ['616'],
        networkViewTab: 1,
      }),
    )
    expect(query.get('selectednodes')).toBe('74')
    expect(query.get('activeNetworkView')).toBe('net-1_74')
    expect(query.get('selectedSubnetworkNodes')).toBe('616')
    expect(query.get('activeNetworkViewTab')).toBe('1')
  })

  it('carries the access key', () => {
    expect(
      queryOf(embedLinkOutUrl(ORIGIN, '/', NET, { accessKey: 'k1' })).get(
        'accesskey',
      ),
    ).toBe('k1')
  })

  it('reads back as the same embed parameters', () => {
    const url = embedLinkOutUrl(ORIGIN, '/', NET, {
      subsystemId: '74',
      subnetworkNodeIds: ['616', '605'],
      networkViewTab: 0,
      accessKey: 'k1',
    })
    expect(readEmbedParams(new URL(url).search)).toEqual({
      selectedNodes: ['74'],
      selectedEdges: [],
      selectedSubnetworkNodes: ['616', '605'],
      networkViewTab: 0,
      accessKey: 'k1',
    })
  })
})
