import {
  fetchMyNdexWorkspaces,
  fetchMyNdexAccountNetworks,
  searchNdexNetworks,
  deleteNdexWorkspace,
} from './workspace'
import { getNdexClient } from './client'

// Mock the NDEx client module
jest.mock('./client', () => ({
  getNdexClient: jest.fn(),
}))

describe('fetchMyNdexWorkspaces', () => {
  const mockGetNdexClient = getNdexClient as jest.MockedFunction<
    typeof getNdexClient
  >

  const createMockWorkspace = (id: string, name: string) => ({
    uuid: id,
    name: name,
    networkIDs: [],
    options: {},
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch user workspaces from NDEx', async () => {
    const mockAccessToken = 'test-access-token'
    const mockWorkspaces = [
      createMockWorkspace('workspace-1', 'Workspace 1'),
      createMockWorkspace('workspace-2', 'Workspace 2'),
    ]

    const mockClient = {
      getUserCyWebWorkspaces: jest.fn().mockResolvedValue(mockWorkspaces),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await fetchMyNdexWorkspaces(mockAccessToken)

    expect(mockGetNdexClient).toHaveBeenCalledWith(mockAccessToken, undefined)
    expect(mockClient.getUserCyWebWorkspaces).toHaveBeenCalled()
    expect(result).toEqual(mockWorkspaces)
    expect(result).toHaveLength(2)
  })

  it('should fetch workspaces with custom NDEx URL', async () => {
    const mockAccessToken = 'test-access-token'
    const mockNdexUrl = 'https://custom.ndex.org'
    const mockWorkspaces = [createMockWorkspace('workspace-1', 'Workspace 1')]

    const mockClient = {
      getUserCyWebWorkspaces: jest.fn().mockResolvedValue(mockWorkspaces),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await fetchMyNdexWorkspaces(mockAccessToken, mockNdexUrl)

    expect(mockGetNdexClient).toHaveBeenCalledWith(mockAccessToken, mockNdexUrl)
    expect(mockClient.getUserCyWebWorkspaces).toHaveBeenCalled()
    expect(result).toEqual(mockWorkspaces)
  })

  it('should handle empty workspaces array', async () => {
    const mockAccessToken = 'test-access-token'
    const mockWorkspaces: any[] = []

    const mockClient = {
      getUserCyWebWorkspaces: jest.fn().mockResolvedValue(mockWorkspaces),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await fetchMyNdexWorkspaces(mockAccessToken)

    expect(result).toEqual([])
    expect(result).toHaveLength(0)
  })

  it('should handle single workspace', async () => {
    const mockAccessToken = 'test-access-token'
    const mockWorkspaces = [createMockWorkspace('workspace-1', 'My Workspace')]

    const mockClient = {
      getUserCyWebWorkspaces: jest.fn().mockResolvedValue(mockWorkspaces),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await fetchMyNdexWorkspaces(mockAccessToken)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(mockWorkspaces[0])
  })

  it('should handle workspaces with network IDs', async () => {
    const mockAccessToken = 'test-access-token'
    const mockWorkspaces = [
      {
        uuid: 'workspace-1',
        name: 'Workspace with Networks',
        networkIDs: ['network-1', 'network-2', 'network-3'],
        options: {
          currentNetwork: 'network-1',
        },
      },
    ]

    const mockClient = {
      getUserCyWebWorkspaces: jest.fn().mockResolvedValue(mockWorkspaces),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await fetchMyNdexWorkspaces(mockAccessToken)

    expect(result).toEqual(mockWorkspaces)
    expect(result[0].networkIDs).toHaveLength(3)
  })

  it('should propagate errors from the NDEx client', async () => {
    const mockAccessToken = 'test-access-token'
    const mockError = new Error('Failed to fetch workspaces')

    const mockClient = {
      getUserCyWebWorkspaces: jest.fn().mockRejectedValue(mockError),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    await expect(fetchMyNdexWorkspaces(mockAccessToken)).rejects.toThrow(
      'Failed to fetch workspaces',
    )

    expect(mockGetNdexClient).toHaveBeenCalledWith(mockAccessToken, undefined)
    expect(mockClient.getUserCyWebWorkspaces).toHaveBeenCalled()
  })

  it('should cast result to Workspace[] type', async () => {
    const mockAccessToken = 'test-access-token'
    const mockWorkspaces = [createMockWorkspace('workspace-1', 'Workspace 1')]

    const mockClient = {
      getUserCyWebWorkspaces: jest.fn().mockResolvedValue(mockWorkspaces),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await fetchMyNdexWorkspaces(mockAccessToken)

    // Type should be Workspace[] (or any[] as per the function signature)
    expect(Array.isArray(result)).toBe(true)
    expect(result[0]).toHaveProperty('uuid')
    expect(result[0]).toHaveProperty('name')
  })
})

describe('fetchMyNdexAccountNetworks', () => {
  const mockGetNdexClient = getNdexClient as jest.MockedFunction<
    typeof getNdexClient
  >

  const createMockNetwork = (id: string, name: string) => ({
    uuid: id,
    name: name,
    nodeCount: 10,
    edgeCount: 20,
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch account networks from NDEx', async () => {
    const mockAccessToken = 'test-access-token'
    const mockNetworks = [
      createMockNetwork('network-1', 'Network 1'),
      createMockNetwork('network-2', 'Network 2'),
    ]

    const mockClient = {
      getAccountPageNetworks: jest.fn().mockResolvedValue(mockNetworks),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await fetchMyNdexAccountNetworks(mockAccessToken)

    expect(mockGetNdexClient).toHaveBeenCalledWith(mockAccessToken, undefined)
    expect(mockClient.getAccountPageNetworks).toHaveBeenCalledWith(0, 1000)
    expect(result).toEqual(mockNetworks)
    expect(result).toHaveLength(2)
  })

  it('should fetch account networks with custom options', async () => {
    const mockAccessToken = 'test-access-token'
    const mockNetworks = [createMockNetwork('network-1', 'Network 1')]

    const mockClient = {
      getAccountPageNetworks: jest.fn().mockResolvedValue(mockNetworks),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await fetchMyNdexAccountNetworks(mockAccessToken, 10, 50)

    expect(mockClient.getAccountPageNetworks).toHaveBeenCalledWith(10, 50)
    expect(result).toEqual(mockNetworks)
  })

  it('should fetch account networks with custom NDEx URL', async () => {
    const mockAccessToken = 'test-access-token'
    const mockNdexUrl = 'https://custom.ndex.org'
    const mockNetworks = [createMockNetwork('network-1', 'Network 1')]

    const mockClient = {
      getAccountPageNetworks: jest.fn().mockResolvedValue(mockNetworks),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await fetchMyNdexAccountNetworks(
      mockAccessToken,
      undefined,
      undefined,
      mockNdexUrl,
    )

    expect(mockGetNdexClient).toHaveBeenCalledWith(mockAccessToken, mockNdexUrl)
    expect(result).toEqual(mockNetworks)
  })

  it('should handle empty networks array', async () => {
    const mockAccessToken = 'test-access-token'
    const mockNetworks: any[] = []

    const mockClient = {
      getAccountPageNetworks: jest.fn().mockResolvedValue(mockNetworks),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await fetchMyNdexAccountNetworks(mockAccessToken)

    expect(result).toEqual([])
    expect(result).toHaveLength(0)
  })

  it('should propagate errors from the NDEx client', async () => {
    const mockAccessToken = 'test-access-token'
    const mockError = new Error('Failed to fetch account networks')

    const mockClient = {
      getAccountPageNetworks: jest.fn().mockRejectedValue(mockError),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    await expect(fetchMyNdexAccountNetworks(mockAccessToken)).rejects.toThrow(
      'Failed to fetch account networks',
    )

    expect(mockGetNdexClient).toHaveBeenCalledWith(mockAccessToken, undefined)
  })
})

describe('searchNdexNetworks', () => {
  const mockGetNdexClient = getNdexClient as jest.MockedFunction<
    typeof getNdexClient
  >

  const createMockNetwork = (id: string, name: string) => ({
    uuid: id,
    name: name,
    nodeCount: 10,
    edgeCount: 20,
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should search networks in NDEx without authentication', async () => {
    const mockSearchValue = 'test query'
    const mockSearchResults = {
      networks: [
        createMockNetwork('network-1', 'Test Network 1'),
        createMockNetwork('network-2', 'Test Network 2'),
      ],
    }

    const mockClient = {
      searchNetworks: jest.fn().mockResolvedValue(mockSearchResults),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await searchNdexNetworks(mockSearchValue)

    expect(mockGetNdexClient).toHaveBeenCalledWith(undefined, undefined)
    expect(mockClient.searchNetworks).toHaveBeenCalledWith(
      mockSearchValue,
      0,
      1000,
    )
    expect(result).toEqual(mockSearchResults)
    expect(result.networks).toHaveLength(2)
  })

  it('should search networks with authentication', async () => {
    const mockSearchValue = 'test query'
    const mockAccessToken = 'test-access-token'
    const mockSearchResults = {
      networks: [createMockNetwork('network-1', 'Test Network 1')],
    }

    const mockClient = {
      searchNetworks: jest.fn().mockResolvedValue(mockSearchResults),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await searchNdexNetworks(mockSearchValue, mockAccessToken)

    expect(mockGetNdexClient).toHaveBeenCalledWith(mockAccessToken, undefined)
    expect(mockClient.searchNetworks).toHaveBeenCalledWith(
      mockSearchValue,
      0,
      1000,
    )
    expect(result).toEqual(mockSearchResults)
  })

  it('should search networks with custom options', async () => {
    const mockSearchValue = 'test query'
    const mockSearchResults = {
      networks: [createMockNetwork('network-1', 'Test Network 1')],
    }

    const mockClient = {
      searchNetworks: jest.fn().mockResolvedValue(mockSearchResults),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await searchNdexNetworks(mockSearchValue, undefined, 20, 50)

    expect(mockClient.searchNetworks).toHaveBeenCalledWith(
      mockSearchValue,
      20,
      50,
    )
    expect(result).toEqual(mockSearchResults)
  })

  it('should search networks with custom NDEx URL', async () => {
    const mockSearchValue = 'test query'
    const mockAccessToken = 'test-access-token'
    const mockNdexUrl = 'https://custom.ndex.org'
    const mockSearchResults = {
      networks: [createMockNetwork('network-1', 'Test Network 1')],
    }

    const mockClient = {
      searchNetworks: jest.fn().mockResolvedValue(mockSearchResults),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await searchNdexNetworks(
      mockSearchValue,
      mockAccessToken,
      undefined,
      undefined,
      mockNdexUrl,
    )

    expect(mockGetNdexClient).toHaveBeenCalledWith(mockAccessToken, mockNdexUrl)
    expect(result).toEqual(mockSearchResults)
  })

  it('should handle empty search results', async () => {
    const mockSearchValue = 'nonexistent query'
    const mockSearchResults = {
      networks: [],
    }

    const mockClient = {
      searchNetworks: jest.fn().mockResolvedValue(mockSearchResults),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await searchNdexNetworks(mockSearchValue)

    expect(result.networks).toEqual([])
    expect(result.networks).toHaveLength(0)
  })

  it('should handle undefined search results', async () => {
    const mockSearchValue = 'test query'
    const mockClient = {
      searchNetworks: jest.fn().mockResolvedValue(undefined),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await searchNdexNetworks(mockSearchValue)

    expect(result).toEqual({ networks: [] })
  })

  it('should propagate errors from the NDEx client', async () => {
    const mockSearchValue = 'test query'
    const mockError = new Error('Search failed')

    const mockClient = {
      searchNetworks: jest.fn().mockRejectedValue(mockError),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    await expect(searchNdexNetworks(mockSearchValue)).rejects.toThrow(
      'Search failed',
    )

    expect(mockGetNdexClient).toHaveBeenCalledWith(undefined, undefined)
  })
})

describe('deleteNdexWorkspace', () => {
  const mockGetNdexClient = getNdexClient as jest.MockedFunction<
    typeof getNdexClient
  >

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should delete a workspace from NDEx', async () => {
    const mockWorkspaceId = 'workspace-uuid-123'
    const mockAccessToken = 'test-access-token'

    const mockClient = {
      deleteCyWebWorkspace: jest.fn().mockResolvedValue(undefined),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    await deleteNdexWorkspace(mockWorkspaceId, mockAccessToken)

    expect(mockGetNdexClient).toHaveBeenCalledWith(mockAccessToken, undefined)
    expect(mockClient.deleteCyWebWorkspace).toHaveBeenCalledWith(
      mockWorkspaceId,
    )
  })

  it('should delete a workspace with custom NDEx URL', async () => {
    const mockWorkspaceId = 'workspace-uuid-456'
    const mockAccessToken = 'test-access-token'
    const mockNdexUrl = 'https://custom.ndex.org'

    const mockClient = {
      deleteCyWebWorkspace: jest.fn().mockResolvedValue(undefined),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    await deleteNdexWorkspace(mockWorkspaceId, mockAccessToken, mockNdexUrl)

    expect(mockGetNdexClient).toHaveBeenCalledWith(mockAccessToken, mockNdexUrl)
    expect(mockClient.deleteCyWebWorkspace).toHaveBeenCalledWith(
      mockWorkspaceId,
    )
  })

  it('should propagate errors from the NDEx client', async () => {
    const mockWorkspaceId = 'workspace-uuid-error'
    const mockAccessToken = 'test-access-token'
    const mockError = new Error('Delete failed')

    const mockClient = {
      deleteCyWebWorkspace: jest.fn().mockRejectedValue(mockError),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    await expect(
      deleteNdexWorkspace(mockWorkspaceId, mockAccessToken),
    ).rejects.toThrow('Delete failed')

    expect(mockGetNdexClient).toHaveBeenCalledWith(mockAccessToken, undefined)
    expect(mockClient.deleteCyWebWorkspace).toHaveBeenCalledWith(
      mockWorkspaceId,
    )
  })
})
