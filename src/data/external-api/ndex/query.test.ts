// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Cx2 } from '../../../models/CxModel/Cx2'
import { getNdexClient } from './client'
import {
  fetchGeneNamesFromIds,
  fetchNdexInterconnectQuery,
  fetchNodeNamesByIds,
} from './query'

// Mock the NDEx client module
vi.mock('./client', () => ({
  getNdexClient: vi.fn(),
}))

// Helper function shared across tests
const createMockCx2Network = (): Cx2 => {
  // Create a minimal valid Cx2 structure
  return [{ CXVersion: '2.0' }, { status: [{ success: true }] }] as Cx2
}

describe('fetchNdexInterconnectQuery', () => {
  const mockGetNdexClient = getNdexClient as import('vitest').MockedFunction<
    typeof getNdexClient
  >

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should execute an interconnect query with parameters', async () => {
    const mockNdexUuid = 'test-network-uuid-123'
    const mockParameters = '1,2'
    const mockAccessToken = 'test-access-token'
    const mockCx2Network = createMockCx2Network()

    const mockClient = {
      networks: {
        interConnectQuery: vi.fn().mockResolvedValue(mockCx2Network),
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
      true,
    )
    expect(result).toEqual(mockCx2Network)
  })

  it('should execute an interconnect query without an access token', async () => {
    const mockNdexUuid = 'test-network-uuid-456'
    const mockParameters = '3'
    const mockCx2Network = createMockCx2Network()

    const mockClient = {
      networks: {
        interConnectQuery: vi.fn().mockResolvedValue(mockCx2Network),
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
      true,
    )
    expect(result).toEqual(mockCx2Network)
  })

  it('should use correct query parameters', async () => {
    const mockNdexUuid = 'test-network-uuid-789'
    const mockParameters = '1,2,3'
    const mockCx2Network = createMockCx2Network()

    const mockClient = {
      networks: {
        interConnectQuery: vi.fn().mockResolvedValue(mockCx2Network),
      },
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    await fetchNdexInterconnectQuery(mockNdexUuid, mockParameters)

    expect(mockClient.networks.interConnectQuery).toHaveBeenCalledWith(
      mockNdexUuid,
      '',
      false,
      { nodeIds: [1, 2, 3] },
      true,
    )
  })

  it('should propagate errors from the NDEx client', async () => {
    const mockNdexUuid = 'test-network-uuid-error'
    const mockParameters = '1'
    const mockError = new Error('Query failed')

    const mockClient = {
      networks: {
        interConnectQuery: vi.fn().mockRejectedValue(mockError),
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
  const mockGetNdexClient = getNdexClient as import('vitest').MockedFunction<
    typeof getNdexClient
  >

  beforeEach(() => {
    vi.clearAllMocks()
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
        getAttributesOfSelectedNodes: vi
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
        getAttributesOfSelectedNodes: vi
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
        getAttributesOfSelectedNodes: vi
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
        getAttributesOfSelectedNodes: vi
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
        getAttributesOfSelectedNodes: vi
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
        getAttributesOfSelectedNodes: vi.fn().mockRejectedValue(mockError),
      },
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    await expect(
      fetchGeneNamesFromIds(mockNetworkUUID, mockIds),
    ).rejects.toThrow('Failed to fetch attributes')

    expect(mockGetNdexClient).toHaveBeenCalledWith(undefined, undefined)
    expect(mockClient.networks.getAttributesOfSelectedNodes).toHaveBeenCalled()
  })

  it('should execute an interconnect query with custom NDEx URL', async () => {
    const mockNdexUuid = 'test-network-uuid-custom-url'
    const mockParameters = '1,2'
    const mockAccessToken = 'test-access-token'
    const mockNdexUrl = 'https://custom.ndex.org'
    const mockCx2Network = createMockCx2Network()

    const mockClient = {
      networks: {
        interConnectQuery: vi.fn().mockResolvedValue(mockCx2Network),
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
        getAttributesOfSelectedNodes: vi
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

describe('fetchNodeNamesByIds', () => {
  const mockGetNdexClient = getNdexClient as import('vitest').MockedFunction<
    typeof getNdexClient
  >

  const clientReturning = (response: unknown) => {
    const client = {
      networks: {
        getAttributesOfSelectedNodes: vi.fn().mockResolvedValue(response),
      },
    }
    mockGetNdexClient.mockReturnValue(client as any)
    return client
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // #933: names used to be read back by position, which only works when the
  // ids happen to be 0..n-1
  it('pairs each name with its node id, not its position', async () => {
    const client = clientReturning({
      '660': { name: 'METTL15' },
      '7': { name: 'SMARCD2' },
      '0': { name: 'ACTB' },
    })

    const names = await fetchNodeNamesByIds(
      'uuid',
      [660, 7, 0],
      'token',
      'https://ndex.example',
    )

    expect(mockGetNdexClient).toHaveBeenCalledWith(
      'token',
      'https://ndex.example',
    )
    expect(client.networks.getAttributesOfSelectedNodes).toHaveBeenCalledWith(
      'uuid',
      { ids: [660, 7, 0], attributeNames: ['name'] },
    )
    expect([...names.entries()].sort()).toEqual([
      ['0', 'ACTB'],
      ['660', 'METTL15'],
      ['7', 'SMARCD2'],
    ])
  })

  it('skips entries that carry no usable name', async () => {
    clientReturning({
      '1': { name: 'GENE1' },
      '2': { name: 42 },
      '3': null,
      '4': 'GENE4',
      '5': {},
      '6': { name: '' },
      '7': { name: '   ' },
    })

    const names = await fetchNodeNamesByIds('uuid', [1, 2, 3, 4, 5, 6, 7])

    expect([...names.entries()]).toEqual([['1', 'GENE1']])
  })

  it('keeps a __proto__ key as plain data', async () => {
    clientReturning(
      JSON.parse('{"__proto__": {"name": "EVIL"}, "1": {"name": "GENE1"}}'),
    )

    const names = await fetchNodeNamesByIds('uuid', [1])

    expect(names.get('1')).toBe('GENE1')
    expect(names.get('__proto__')).toBe('EVIL')
    expect(({} as Record<string, unknown>).name).toBeUndefined()
  })

  it.each([null, 'not an object', 7, ['GENE1']])(
    'rejects a response that is not an id-keyed object (%j)',
    async (response) => {
      clientReturning(response)

      await expect(fetchNodeNamesByIds('uuid', [1])).rejects.toThrow(
        /Unexpected node name response/,
      )
    },
  )

  it('propagates errors from the NDEx client', async () => {
    mockGetNdexClient.mockReturnValue({
      networks: {
        getAttributesOfSelectedNodes: vi
          .fn()
          .mockRejectedValue(new Error('404')),
      },
    } as any)

    await expect(fetchNodeNamesByIds('uuid', [1])).rejects.toThrow('404')
  })
})
