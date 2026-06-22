import { CyNetwork } from '../../../models/CyNetworkModel'
import {
  fetchNdexInterconnectQuery,
  fetchNdexNetwork,
} from '../../../data/external-api/ndex'
import { Cx2 } from '../../../models/CxModel/Cx2'
import { getCyNetworkFromCx2 } from '../../../models/CxModel/impl'
import { fetchNdexSubnetworkByQuery } from './subnetworkQueryUtil'

jest.mock('../../../data/external-api/ndex', () => ({
  fetchNdexInterconnectQuery: jest.fn(),
  fetchNdexNetwork: jest.fn(),
}))

jest.mock('../../../models/CxModel/impl', () => ({
  getCyNetworkFromCx2: jest.fn(),
}))

const mockFetchNdexInterconnectQuery =
  fetchNdexInterconnectQuery as jest.MockedFunction<
    typeof fetchNdexInterconnectQuery
  >
const mockFetchNdexNetwork = fetchNdexNetwork as jest.MockedFunction<
  typeof fetchNdexNetwork
>
const mockGetCyNetworkFromCx2 = getCyNetworkFromCx2 as jest.MockedFunction<
  typeof getCyNetworkFromCx2
>

const makeMockCyNetwork = (id: string): CyNetwork =>
  ({
    network: {
      id,
      nodes: [{ id: 'n1' }],
      edges: [{ id: 'e1', s: 'n1', t: 'n1' }],
    },
    networkViews: [
      {
        id: `${id}_view`,
        networkId: id,
        nodeViews: { n1: { id: 'n1', x: 0, y: 0 } },
        edgeViews: { e1: { id: 'e1' } },
      },
    ],
    nodeTable: { id: `${id}_node`, rows: new Map() },
    edgeTable: { id: `${id}_edge`, rows: new Map() },
    visualStyle: undefined,
    networkAttributes: undefined,
    otherAspects: [],
  }) as unknown as CyNetwork

describe('fetchNdexSubnetworkByQuery', () => {
  const hierarchyId = 'hierarchy-abc'
  const interactionNetworkHost = 'https://ndex.example.org'
  const rootNetworkUuid = 'root-uuid-123'
  const subsystemId = 'node-42'
  const accessToken = 'test-token'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('uses interconnect query when no interactionNetworkUUID is provided', async () => {
    // This tests the Music 1 scenario: no per-node UUID, query by member IDs
    const nodeIds = '1,2,3'
    const interactionNetworkUuid = ''

    const mockCx2 = [{ CXVersion: '2.0' }, { status: [{ success: true }] }] as Cx2
    const expectedNetwork = makeMockCyNetwork(`${hierarchyId}_${subsystemId}`)

    mockFetchNdexInterconnectQuery.mockResolvedValue(mockCx2)
    mockGetCyNetworkFromCx2.mockReturnValue(expectedNetwork)

    const result = await fetchNdexSubnetworkByQuery([
      hierarchyId,
      interactionNetworkHost,
      rootNetworkUuid,
      subsystemId,
      nodeIds,
      interactionNetworkUuid,
      accessToken,
    ])

    expect(mockFetchNdexInterconnectQuery).toHaveBeenCalledWith(
      rootNetworkUuid,
      nodeIds,
      accessToken,
      interactionNetworkHost,
    )
    expect(mockFetchNdexNetwork).not.toHaveBeenCalled()
    expect(result).toBe(expectedNetwork)
  })

  it('uses UUID fetch when interactionNetworkUUID is provided', async () => {
    // This tests the Music 2 scenario: per-node UUID, fetch directly
    const nodeIds = '1,2,3'
    const interactionNetworkUuid = 'interaction-uuid-456'

    const mockCx2 = [{ CXVersion: '2.0' }, { status: [{ success: true }] }] as Cx2
    const expectedNetwork = makeMockCyNetwork(`${hierarchyId}_${subsystemId}`)

    mockFetchNdexNetwork.mockResolvedValue(mockCx2)
    mockGetCyNetworkFromCx2.mockReturnValue(expectedNetwork)

    const result = await fetchNdexSubnetworkByQuery([
      hierarchyId,
      interactionNetworkHost,
      rootNetworkUuid,
      subsystemId,
      nodeIds,
      interactionNetworkUuid,
      accessToken,
    ])

    expect(mockFetchNdexNetwork).toHaveBeenCalledWith(
      interactionNetworkUuid,
      accessToken,
      interactionNetworkHost,
    )
    expect(mockFetchNdexInterconnectQuery).not.toHaveBeenCalled()
    expect(result).toBe(expectedNetwork)
  })

  it('throws when required parameters are missing', async () => {
    await expect(
      fetchNdexSubnetworkByQuery([
        undefined as unknown as string, // hierarchyId missing
        interactionNetworkHost,
        rootNetworkUuid,
        subsystemId,
        '1,2,3',
        '',
        accessToken,
      ]),
    ).rejects.toThrow('Missing parameters')
  })
})
