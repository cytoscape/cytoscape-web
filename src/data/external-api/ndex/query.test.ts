import { Cx2 } from '../../../models/CxModel/Cx2'
import { getNdexClient } from './client'
import { fetchGeneNamesFromIds, fetchNdexInterconnectQuery } from './query'

// Mock the NDEx client module
jest.mock('./client', () => ({
  getNdexClient: jest.fn(),
}))

// Helper function shared across tests
const createMockCx2Network = (): Cx2 => {
  // Create a minimal valid Cx2 structure
  return [{ CXVersion: '2.0' }, { status: [{ success: true }] }] as Cx2
}

describe('fetchNdexInterconnectQuery', () => {
  const mockGetNdexClient = getNdexClient as jest.MockedFunction<
    typeof getNdexClient
  >

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should execute an interconnect query with parameters', async () => {
    const mockNdexUuid = 'test-network-uuid-123'
    const mockParameters = '1,2'
    const mockAccessToken = 'test-access-token'
    const mockCx2Network = createMockCx2Network()

    const mockClient = {
      networks: {
        interConnectQuery: jest.fn().mockResolvedValue(mockCx2Network),
      },
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await fetchNdexInterconnectQuery(
      mockNdexUuid,
      mockParameters,
      mockAccessToken,
    )

    expect(mockGetNdexClient).toHaveBeenCalledWith(mockAccessToken, undefined)
    expect(mockClient.networks.interConnectQuery).toHaveBeenCalledWith(
      mockNdexUuid,
      '',
      false,
      { nodeIds: [1, 2] },
      false,
    )
    expect(result).toEqual(mockCx2Network)
  })

  it('should execute an interconnect query without an access token', async () => {
    const mockNdexUuid = 'test-network-uuid-456'
    const mockParameters = '3'
    const mockCx2Network = createMockCx2Network()

    const mockClient = {
      networks: {
        interConnectQuery: jest.fn().mockResolvedValue(mockCx2Network),
      },
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await fetchNdexInterconnectQuery(
      mockNdexUuid,
      mockParameters,
    )

    expect(mockGetNdexClient).toHaveBeenCalledWith(undefined, undefined)
    expect(mockClient.networks.interConnectQuery).toHaveBeenCalledWith(
      mockNdexUuid,
      '',
      false,
      { nodeIds: [3] },
      false,
    )
    expect(result).toEqual(mockCx2Network)
  })

  it('should use correct query parameters', async () => {
    const mockNdexUuid = 'test-network-uuid-789'
    const mockParameters = '1,2,3'
    const mockCx2Network = createMockCx2Network()

    const mockClient = {
      networks: {
        interConnectQuery: jest.fn().mockResolvedValue(mockCx2Network),
      },
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    await fetchNdexInterconnectQuery(mockNdexUuid, mockParameters)

    expect(mockClient.networks.interConnectQuery).toHaveBeenCalledWith(
      mockNdexUuid,
      '',
      false,
      { nodeIds: [1, 2, 3] },
      false,
    )
  })

  it('should propagate errors from the NDEx client', async () => {
    const mockNdexUuid = 'test-network-uuid-error'
    const mockParameters = '1'
    const mockError = new Error('Query failed')

    const mockClient = {
      networks: {
        interConnectQuery: jest.fn().mockRejectedValue(mockError),
      },
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    await expect(
      fetchNdexInterconnectQuery(mockNdexUuid, mockParameters),
    ).rejects.toThrow('Query failed')

    expect(mockGetNdexClient).toHaveBeenCalledWith(undefined, undefined)
    expect(mockClient.networks.interConnectQuery).toHaveBeenCalled()
  })
})

describe('fetchGeneNamesFromIds', () => {
  const mockGetNdexClient = getNdexClient as jest.MockedFunction<
    typeof getNdexClient
  >

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch gene names from member IDs', async () => {
    const mockNetworkUUID = 'test-network-uuid-123'
    const mockIds = ['1', '2', '3']
    const mockAccessToken = 'test-access-token'
    const mockGeneNameMap = {
      1: { name: 'Gene1' },
      2: { name: 'Gene2' },
      3: { name: 'Gene3' },
    }

    const mockClient = {
      networks: {
        getAttributesOfSelectedNodes: jest
          .fn()
          .mockResolvedValue(mockGeneNameMap),
      },
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await fetchGeneNamesFromIds(
      mockNetworkUUID,
      mockIds,
      mockAccessToken,
    )

    expect(mockGetNdexClient).toHaveBeenCalledWith(mockAccessToken, undefined)
    expect(
      mockClient.networks.getAttributesOfSelectedNodes,
    ).toHaveBeenCalledWith(mockNetworkUUID, {
      ids: [1, 2, 3],
      attributeNames: ['name'],
    })
    expect(result).toEqual(['Gene1', 'Gene2', 'Gene3'])
  })

  it('should fetch gene names without an access token', async () => {
    const mockNetworkUUID = 'test-network-uuid-456'
    const mockIds = ['1', '2']
    const mockGeneNameMap = {
      1: { name: 'Gene1' },
      2: { name: 'Gene2' },
    }

    const mockClient = {
      networks: {
        getAttributesOfSelectedNodes: jest
          .fn()
          .mockResolvedValue(mockGeneNameMap),
      },
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await fetchGeneNamesFromIds(mockNetworkUUID, mockIds)

    expect(mockGetNdexClient).toHaveBeenCalledWith(undefined, undefined)
    expect(
      mockClient.networks.getAttributesOfSelectedNodes,
    ).toHaveBeenCalledWith(mockNetworkUUID, {
      ids: [1, 2],
      attributeNames: ['name'],
    })
    expect(result).toEqual(['Gene1', 'Gene2'])
  })

  it('should handle empty ID array', async () => {
    const mockNetworkUUID = 'test-network-uuid-empty'
    const mockIds: string[] = []
    const mockGeneNameMap = {}

    const mockClient = {
      networks: {
        getAttributesOfSelectedNodes: jest
          .fn()
          .mockResolvedValue(mockGeneNameMap),
      },
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await fetchGeneNamesFromIds(mockNetworkUUID, mockIds)

    expect(
      mockClient.networks.getAttributesOfSelectedNodes,
    ).toHaveBeenCalledWith(mockNetworkUUID, {
      ids: [],
      attributeNames: ['name'],
    })
    expect(result).toEqual([])
  })

  it('should handle single ID', async () => {
    const mockNetworkUUID = 'test-network-uuid-single'
    const mockIds = ['1']
    const mockGeneNameMap = {
      1: { name: 'SingleGene' },
    }

    const mockClient = {
      networks: {
        getAttributesOfSelectedNodes: jest
          .fn()
          .mockResolvedValue(mockGeneNameMap),
      },
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await fetchGeneNamesFromIds(mockNetworkUUID, mockIds)

    expect(result).toEqual(['SingleGene'])
    expect(result).toHaveLength(1)
  })

  it('should map object values to gene names correctly', async () => {
    const mockNetworkUUID = 'test-network-uuid-map'
    const mockIds = ['1', '2']
    const mockGeneNameMap = {
      1: { name: 'GeneA', otherProperty: 'value' },
      2: { name: 'GeneB' },
    }

    const mockClient = {
      networks: {
        getAttributesOfSelectedNodes: jest
          .fn()
          .mockResolvedValue(mockGeneNameMap),
      },
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await fetchGeneNamesFromIds(mockNetworkUUID, mockIds)

    // Should only extract the 'name' property
    expect(result).toEqual(['GeneA', 'GeneB'])
  })

  it('should propagate errors from the NDEx client', async () => {
    const mockNetworkUUID = 'test-network-uuid-error'
    const mockIds = ['1', '2']
    const mockError = new Error('Failed to fetch attributes')

    const mockClient = {
      networks: {
        getAttributesOfSelectedNodes: jest.fn().mockRejectedValue(mockError),
      },
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    await expect(
      fetchGeneNamesFromIds(mockNetworkUUID, mockIds),
    ).rejects.toThrow('Failed to fetch attributes')

    expect(mockGetNdexClient).toHaveBeenCalledWith(undefined, undefined)
    expect(
      mockClient.networks.getAttributesOfSelectedNodes,
    ).toHaveBeenCalled()
  })

  it('should execute an interconnect query with custom NDEx URL', async () => {
    const mockNdexUuid = 'test-network-uuid-custom-url'
    const mockParameters = '1,2'
    const mockAccessToken = 'test-access-token'
    const mockNdexUrl = 'https://custom.ndex.org'
    const mockCx2Network = createMockCx2Network()

    const mockClient = {
      networks: {
        interConnectQuery: jest.fn().mockResolvedValue(mockCx2Network),
      },
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await fetchNdexInterconnectQuery(
      mockNdexUuid,
      mockParameters,
      mockAccessToken,
      mockNdexUrl,
    )

    expect(mockGetNdexClient).toHaveBeenCalledWith(mockAccessToken, mockNdexUrl)
    expect(mockClient.networks.interConnectQuery).toHaveBeenCalled()
    expect(result).toEqual(mockCx2Network)
  })

  it('should fetch gene names with custom NDEx URL', async () => {
    const mockNetworkUUID = 'test-network-uuid-custom-url'
    const mockIds = ['1', '2']
    const mockAccessToken = 'test-access-token'
    const mockNdexUrl = 'https://custom.ndex.org'
    const mockGeneNameMap = {
      1: { name: 'Gene1' },
      2: { name: 'Gene2' },
    }

    const mockClient = {
      networks: {
        getAttributesOfSelectedNodes: jest
          .fn()
          .mockResolvedValue(mockGeneNameMap),
      },
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await fetchGeneNamesFromIds(
      mockNetworkUUID,
      mockIds,
      mockAccessToken,
      mockNdexUrl,
    )

    expect(mockGetNdexClient).toHaveBeenCalledWith(mockAccessToken, mockNdexUrl)
    expect(result).toEqual(['Gene1', 'Gene2'])
  })
})
