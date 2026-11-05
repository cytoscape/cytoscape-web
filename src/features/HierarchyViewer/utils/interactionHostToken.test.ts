// @vitest-environment node
import { createServer, type IncomingHttpHeaders, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest'

import {
  getNDExBaseUrl,
  setNDExBaseUrl,
} from '../../../data/external-api/ndex/config'
import { resolveMemberNames } from '../components/CirclePackingLayout/memberNames'
import { fetchNdexSubnetworkByQuery } from './subnetworkQueryUtil'

/**
 * `HCX::interactionNetworkHost` comes from the network, so it is untrusted
 * (#936). These tests drive both hierarchy paths through the real NDEx client
 * against real local servers, and check the headers that actually arrive: one
 * server plays the configured NDEx host, the other the host a hostile hierarchy
 * names.
 */
const TOKEN = 'users-keycloak-token'
const NETWORK_UUID = '11111111-2222-3333-4444-555555555555'

const CX2 = [
  { CXVersion: '2.0', hasFragments: false },
  {
    metaData: [
      { name: 'nodes', elementCount: 2 },
      { name: 'edges', elementCount: 1 },
    ],
  },
  {
    nodes: [
      { id: 0, x: 0, y: 0, v: {} },
      { id: 1, x: 1, y: 1, v: {} },
    ],
  },
  { edges: [{ id: 0, s: 0, t: 1, v: {} }] },
  { status: [{ success: true, error: '' }] },
]

interface RecordedRequest {
  method: string | undefined
  url: string | undefined
  headers: IncomingHttpHeaders
}

const startServer = async (
  requests: RecordedRequest[],
): Promise<{ server: Server; url: string }> => {
  const server = createServer((req, res) => {
    requests.push({ method: req.method, url: req.url, headers: req.headers })
    req.resume()
    req.on('end', () => {
      const isNameLookup = req.url?.includes('/nodes') ?? false
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(isNameLookup ? { 1: { name: 'TP53' } } : CX2))
    })
  })
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
  const { port } = server.address() as AddressInfo
  return { server, url: `http://127.0.0.1:${port}` }
}

const stopServer = async (server: Server): Promise<void> => {
  server.closeAllConnections()
  await new Promise((resolve) => server.close(resolve))
}

describe('the token and HCX::interactionNetworkHost', () => {
  const originalBaseUrl = getNDExBaseUrl()
  const configuredRequests: RecordedRequest[] = []
  const foreignRequests: RecordedRequest[] = []
  let configured: { server: Server; url: string }
  let foreign: { server: Server; url: string }

  beforeAll(async () => {
    configured = await startServer(configuredRequests)
    foreign = await startServer(foreignRequests)
  })

  afterAll(async () => {
    await stopServer(configured.server)
    await stopServer(foreign.server)
  })

  beforeEach(() => {
    setNDExBaseUrl(configured.url)
    configuredRequests.length = 0
    foreignRequests.length = 0
  })

  afterEach(() => {
    setNDExBaseUrl(originalBaseUrl)
  })

  const lookUpNames = (hostUrl: string) =>
    resolveMemberNames({
      members: ['1'],
      interactionNetworkId: NETWORK_UUID,
      interactionNetworkHostUrl: hostUrl,
      getToken: async () => TOKEN,
    })

  // The parameter order is fetchNdexSubnetworkByQuery's query key + the token
  const fetchByUuid = (hostUrl: string) =>
    fetchNdexSubnetworkByQuery([
      'hierarchy',
      hostUrl,
      NETWORK_UUID,
      'subsystem',
      '0,1',
      NETWORK_UUID,
      TOKEN,
    ])

  const fetchByInterconnect = (hostUrl: string) =>
    fetchNdexSubnetworkByQuery([
      'hierarchy',
      hostUrl,
      NETWORK_UUID,
      'subsystem',
      '0,1',
      '',
      TOKEN,
    ])

  describe('Cell View member names', () => {
    it('does not reach a foreign host with the token, and still gets the names', async () => {
      const names = await lookUpNames(foreign.url)

      expect(foreignRequests).toHaveLength(1)
      expect(foreignRequests[0].url).toContain(
        `/search/networks/${NETWORK_UUID}/nodes`,
      )
      expect(foreignRequests[0].headers.authorization).toBeUndefined()
      expect(names.get('1')).toBe('TP53')
    })

    it('sends the token to the configured host', async () => {
      await lookUpNames(configured.url)

      expect(foreignRequests).toHaveLength(0)
      expect(configuredRequests).toHaveLength(1)
      expect(configuredRequests[0].headers.authorization).toBe(
        `Bearer ${TOKEN}`,
      )
    })
  })

  describe.each([
    ['by interaction network UUID', fetchByUuid],
    ['by interconnect query', fetchByInterconnect],
  ])('subnetwork fetch %s', (_label, fetchSubnetwork) => {
    it('does not reach a foreign host with the token, and still gets the network', async () => {
      const result = await fetchSubnetwork(foreign.url)

      expect(foreignRequests.length).toBeGreaterThan(0)
      for (const request of foreignRequests) {
        expect(request.headers.authorization).toBeUndefined()
      }
      expect(result.network.nodes).toHaveLength(2)
    })

    it('sends the token to the configured host', async () => {
      await fetchSubnetwork(configured.url)

      expect(foreignRequests).toHaveLength(0)
      expect(configuredRequests.length).toBeGreaterThan(0)
      for (const request of configuredRequests) {
        expect(request.headers.authorization).toBe(`Bearer ${TOKEN}`)
      }
    })
  })
})
