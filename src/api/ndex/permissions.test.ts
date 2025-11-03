import {
  getNdexNetworkPermission,
  hasNdexEditPermission,
  PermissionType,
} from './permissions'
import { getNdexClient } from './client'

// Mock the NDEx client module
jest.mock('./client', () => ({
  getNdexClient: jest.fn(),
}))

describe('getNdexNetworkPermission', () => {
  const mockGetNdexClient = getNdexClient as jest.MockedFunction<
    typeof getNdexClient
  >

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should get permission for a network', async () => {
    const mockNetworkId = 'test-network-uuid-123'
    const mockAccessToken = 'test-access-token'
    const mockPermissions = {
      [mockNetworkId]: PermissionType.WRITE,
    }

    const mockClient = {
      getNetworkPermissionsByUUIDs: jest
        .fn()
        .mockResolvedValue(mockPermissions),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await getNdexNetworkPermission(
      mockNetworkId,
      mockAccessToken,
    )

    expect(mockGetNdexClient).toHaveBeenCalledWith(mockAccessToken, undefined)
    expect(mockClient.getNetworkPermissionsByUUIDs).toHaveBeenCalledWith([
      mockNetworkId,
    ])
    expect(result).toBe(PermissionType.WRITE)
  })

  it('should get ADMIN permission', async () => {
    const mockNetworkId = 'test-network-uuid-admin'
    const mockAccessToken = 'test-access-token'
    const mockPermissions = {
      [mockNetworkId]: PermissionType.ADMIN,
    }

    const mockClient = {
      getNetworkPermissionsByUUIDs: jest
        .fn()
        .mockResolvedValue(mockPermissions),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await getNdexNetworkPermission(
      mockNetworkId,
      mockAccessToken,
    )

    expect(result).toBe(PermissionType.ADMIN)
  })

  it('should get READ permission', async () => {
    const mockNetworkId = 'test-network-uuid-read'
    const mockAccessToken = 'test-access-token'
    const mockPermissions = {
      [mockNetworkId]: PermissionType.READ,
    }

    const mockClient = {
      getNetworkPermissionsByUUIDs: jest
        .fn()
        .mockResolvedValue(mockPermissions),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await getNdexNetworkPermission(
      mockNetworkId,
      mockAccessToken,
    )

    expect(result).toBe(PermissionType.READ)
  })

  it('should return undefined if permission not found', async () => {
    const mockNetworkId = 'test-network-uuid-not-found'
    const mockAccessToken = 'test-access-token'
    const mockPermissions = {}

    const mockClient = {
      getNetworkPermissionsByUUIDs: jest
        .fn()
        .mockResolvedValue(mockPermissions),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await getNdexNetworkPermission(
      mockNetworkId,
      mockAccessToken,
    )

    expect(result).toBeUndefined()
  })

  it('should work with custom NDEx URL', async () => {
    const mockNetworkId = 'test-network-uuid-custom'
    const mockAccessToken = 'test-access-token'
    const mockNdexUrl = 'https://custom.ndex.org'
    const mockPermissions = {
      [mockNetworkId]: PermissionType.WRITE,
    }

    const mockClient = {
      getNetworkPermissionsByUUIDs: jest
        .fn()
        .mockResolvedValue(mockPermissions),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await getNdexNetworkPermission(
      mockNetworkId,
      mockAccessToken,
      mockNdexUrl,
    )

    expect(mockGetNdexClient).toHaveBeenCalledWith(mockAccessToken, mockNdexUrl)
    expect(result).toBe(PermissionType.WRITE)
  })

  it('should propagate errors from the NDEx client', async () => {
    const mockNetworkId = 'test-network-uuid-error'
    const mockAccessToken = 'test-access-token'
    const mockError = new Error('Permission check failed')

    const mockClient = {
      getNetworkPermissionsByUUIDs: jest.fn().mockRejectedValue(mockError),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    await expect(
      getNdexNetworkPermission(mockNetworkId, mockAccessToken),
    ).rejects.toThrow('Permission check failed')

    expect(mockGetNdexClient).toHaveBeenCalledWith(mockAccessToken, undefined)
  })
})

describe('hasNdexEditPermission', () => {
  const mockGetNdexClient = getNdexClient as jest.MockedFunction<
    typeof getNdexClient
  >

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return true for ADMIN permission', async () => {
    const mockNetworkId = 'test-network-uuid-admin'
    const mockAccessToken = 'test-access-token'
    const mockPermissions = {
      [mockNetworkId]: PermissionType.ADMIN,
    }

    const mockClient = {
      getNetworkPermissionsByUUIDs: jest
        .fn()
        .mockResolvedValue(mockPermissions),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await hasNdexEditPermission(mockNetworkId, mockAccessToken)

    expect(result).toBe(true)
  })

  it('should return true for WRITE permission', async () => {
    const mockNetworkId = 'test-network-uuid-write'
    const mockAccessToken = 'test-access-token'
    const mockPermissions = {
      [mockNetworkId]: PermissionType.WRITE,
    }

    const mockClient = {
      getNetworkPermissionsByUUIDs: jest
        .fn()
        .mockResolvedValue(mockPermissions),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await hasNdexEditPermission(mockNetworkId, mockAccessToken)

    expect(result).toBe(true)
  })

  it('should return false for READ permission', async () => {
    const mockNetworkId = 'test-network-uuid-read'
    const mockAccessToken = 'test-access-token'
    const mockPermissions = {
      [mockNetworkId]: PermissionType.READ,
    }

    const mockClient = {
      getNetworkPermissionsByUUIDs: jest
        .fn()
        .mockResolvedValue(mockPermissions),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await hasNdexEditPermission(mockNetworkId, mockAccessToken)

    expect(result).toBe(false)
  })

  it('should return false if permission is undefined', async () => {
    const mockNetworkId = 'test-network-uuid-undefined'
    const mockAccessToken = 'test-access-token'
    const mockPermissions = {}

    const mockClient = {
      getNetworkPermissionsByUUIDs: jest
        .fn()
        .mockResolvedValue(mockPermissions),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await hasNdexEditPermission(mockNetworkId, mockAccessToken)

    expect(result).toBe(false)
  })

  it('should return false on error', async () => {
    const mockNetworkId = 'test-network-uuid-error'
    const mockAccessToken = 'test-access-token'
    const mockError = new Error('Permission check failed')

    const mockClient = {
      getNetworkPermissionsByUUIDs: jest.fn().mockRejectedValue(mockError),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await hasNdexEditPermission(mockNetworkId, mockAccessToken)

    expect(result).toBe(false)
  })

  it('should work with custom NDEx URL', async () => {
    const mockNetworkId = 'test-network-uuid-custom'
    const mockAccessToken = 'test-access-token'
    const mockNdexUrl = 'https://custom.ndex.org'
    const mockPermissions = {
      [mockNetworkId]: PermissionType.WRITE,
    }

    const mockClient = {
      getNetworkPermissionsByUUIDs: jest
        .fn()
        .mockResolvedValue(mockPermissions),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await hasNdexEditPermission(
      mockNetworkId,
      mockAccessToken,
      mockNdexUrl,
    )

    expect(mockGetNdexClient).toHaveBeenCalledWith(mockAccessToken, mockNdexUrl)
    expect(result).toBe(true)
  })
})
