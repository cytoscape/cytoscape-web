import { Cx2 } from '../../models/CxModel/Cx2'
import { getNdexClient } from './client'
import { fetchNdexNetwork, updateNdexNetwork } from './network'

// Mock the NDEx client module
jest.mock('./client', () => ({
  getNdexClient: jest.fn(),
}))

describe('fetchNdexNetwork', () => {
  const mockGetNdexClient = getNdexClient as jest.MockedFunction<
    typeof getNdexClient
  >

  const createMockCx2Network = (): Cx2 => {
    // Create a minimal valid Cx2 structure
    // Cx2 is a tuple: [CxDescriptor, ...Aspect[], Status]
    return [
      { CXVersion: '2.0' }, // CxDescriptor
      { status: [{ success: true }] }, // Status aspect
    ] as Cx2
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch a network from NDEx by UUID', async () => {
    const mockNetworkUuid = 'test-network-uuid-123'
    const mockAccessToken = 'test-access-token'
    const mockCx2Network = createMockCx2Network()

    const mockClient = {
      getCX2Network: jest.fn().mockResolvedValue(mockCx2Network),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await fetchNdexNetwork(mockNetworkUuid, mockAccessToken)

    expect(mockGetNdexClient).toHaveBeenCalledWith(mockAccessToken, undefined)
    expect(mockClient.getCX2Network).toHaveBeenCalledWith(mockNetworkUuid)
    expect(result).toEqual(mockCx2Network)
  })

  it('should fetch a network without an access token', async () => {
    const mockNetworkUuid = 'test-network-uuid-456'
    const mockCx2Network = createMockCx2Network()

    const mockClient = {
      getCX2Network: jest.fn().mockResolvedValue(mockCx2Network),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await fetchNdexNetwork(mockNetworkUuid)

    expect(mockGetNdexClient).toHaveBeenCalledWith(undefined, undefined)
    expect(mockClient.getCX2Network).toHaveBeenCalledWith(mockNetworkUuid)
    expect(result).toEqual(mockCx2Network)
  })

  it('should propagate errors from the NDEx client', async () => {
    const mockNetworkUuid = 'test-network-uuid-789'
    const mockError = new Error('Network not found')

    const mockClient = {
      getCX2Network: jest.fn().mockRejectedValue(mockError),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    await expect(fetchNdexNetwork(mockNetworkUuid)).rejects.toThrow(
      'Network not found',
    )

    expect(mockGetNdexClient).toHaveBeenCalledWith(undefined, undefined)
    expect(mockClient.getCX2Network).toHaveBeenCalledWith(mockNetworkUuid)
  })

  it('should fetch a network with custom NDEx URL', async () => {
    const mockNetworkUuid = 'test-network-uuid-custom-url'
    const mockAccessToken = 'test-access-token'
    const mockNdexUrl = 'https://custom.ndex.org'
    const mockCx2Network = createMockCx2Network()

    const mockClient = {
      getCX2Network: jest.fn().mockResolvedValue(mockCx2Network),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await fetchNdexNetwork(
      mockNetworkUuid,
      mockAccessToken,
      mockNdexUrl,
    )

    expect(mockGetNdexClient).toHaveBeenCalledWith(mockAccessToken, mockNdexUrl)
    expect(mockClient.getCX2Network).toHaveBeenCalledWith(mockNetworkUuid)
    expect(result).toEqual(mockCx2Network)
  })
})

describe('updateNdexNetwork', () => {
  const mockGetNdexClient = getNdexClient as jest.MockedFunction<
    typeof getNdexClient
  >

  const createMockCx2Network = (): Cx2 => {
    return [{ CXVersion: '2.0' }, { status: [{ success: true }] }] as Cx2
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should update a network in NDEx by ID', async () => {
    const mockNetworkId = 'test-network-uuid-123'
    const mockAccessToken = 'test-access-token'
    const mockCx2Network = createMockCx2Network()

    const mockClient = {
      updateNetworkFromRawCX2: jest.fn().mockResolvedValue(undefined),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    await updateNdexNetwork(mockNetworkId, mockCx2Network, mockAccessToken)

    expect(mockGetNdexClient).toHaveBeenCalledWith(mockAccessToken, undefined)
    expect(mockClient.updateNetworkFromRawCX2).toHaveBeenCalledWith(
      mockNetworkId,
      mockCx2Network,
    )
  })

  it('should update a network with custom NDEx URL', async () => {
    const mockNetworkId = 'test-network-uuid-custom-url'
    const mockAccessToken = 'test-access-token'
    const mockNdexUrl = 'https://custom.ndex.org'
    const mockCx2Network = createMockCx2Network()

    const mockClient = {
      updateNetworkFromRawCX2: jest.fn().mockResolvedValue(undefined),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    await updateNdexNetwork(
      mockNetworkId,
      mockCx2Network,
      mockAccessToken,
      mockNdexUrl,
    )

    expect(mockGetNdexClient).toHaveBeenCalledWith(mockAccessToken, mockNdexUrl)
    expect(mockClient.updateNetworkFromRawCX2).toHaveBeenCalledWith(
      mockNetworkId,
      mockCx2Network,
    )
  })

  it('should update a network without an access token', async () => {
    const mockNetworkId = 'test-network-uuid-456'
    const mockCx2Network = createMockCx2Network()

    const mockClient = {
      updateNetworkFromRawCX2: jest.fn().mockResolvedValue(undefined),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    await updateNdexNetwork(mockNetworkId, mockCx2Network)

    expect(mockGetNdexClient).toHaveBeenCalledWith(undefined, undefined)
    expect(mockClient.updateNetworkFromRawCX2).toHaveBeenCalledWith(
      mockNetworkId,
      mockCx2Network,
    )
  })

  it('should propagate errors from the NDEx client', async () => {
    const mockNetworkId = 'test-network-uuid-789'
    const mockCx2Network = createMockCx2Network()
    const mockError = new Error('Update failed')

    const mockClient = {
      updateNetworkFromRawCX2: jest.fn().mockRejectedValue(mockError),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    await expect(
      updateNdexNetwork(mockNetworkId, mockCx2Network),
    ).rejects.toThrow('Update failed')

    expect(mockGetNdexClient).toHaveBeenCalledWith(undefined, undefined)
    expect(mockClient.updateNetworkFromRawCX2).toHaveBeenCalledWith(
      mockNetworkId,
      mockCx2Network,
    )
  })
})
