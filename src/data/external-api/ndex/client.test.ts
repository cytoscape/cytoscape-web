// @vitest-environment node
import { NDExClient } from '@js4cytoscape/ndex-client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getNdexClient } from './client'
import { getNDExBaseUrl } from './config'

// Mock the NDEx client module
vi.mock('@js4cytoscape/ndex-client', () => {
  const mockUpdateConfig = vi.fn()
  const MockClient = vi.fn()
  MockClient.prototype.updateConfig = mockUpdateConfig
  MockClient.prototype.networks = {}
  MockClient.prototype.workspace = {}
  MockClient.prototype.user = {}
  MockClient.prototype.files = {}
  return {
    NDExClient: MockClient,
  }
})

// Mock the config module
vi.mock('./config', () => ({
  getNDExBaseUrl: vi.fn(() => 'https://default.ndex.org'),
}))

describe('getNdexClient', () => {
  const mockGetNDExBaseUrl = getNDExBaseUrl as import('vitest').MockedFunction<
    typeof getNDExBaseUrl
  >
  const MockNDExClient = NDExClient as import('vitest').MockedClass<typeof NDExClient>

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetNDExBaseUrl.mockReturnValue('https://default.ndex.org')
  })

  it('should create a client with default URL when no URL is provided', () => {
    getNdexClient()

    expect(mockGetNDExBaseUrl).toHaveBeenCalled()
    expect(MockNDExClient).toHaveBeenCalledWith({
      baseURL: 'https://default.ndex.org',
    })
  })

  it('should create a client with provided URL', () => {
    const customUrl = 'https://custom.ndex.org'
    getNdexClient(undefined, customUrl)

    expect(mockGetNDExBaseUrl).not.toHaveBeenCalled()
    expect(MockNDExClient).toHaveBeenCalledWith({
      baseURL: customUrl,
    })
  })

  it('should create a client with access token and default URL', () => {
    const accessToken = 'test-token'
    const client = getNdexClient(accessToken)

    expect(mockGetNDExBaseUrl).toHaveBeenCalled()
    expect(MockNDExClient).toHaveBeenCalledWith({
      baseURL: 'https://default.ndex.org',
    })
    expect(client.updateConfig).toHaveBeenCalledWith({
      auth: {
        type: 'oauth',
        idToken: accessToken,
      },
    })
  })

  it('should create a client with access token and custom URL', () => {
    const accessToken = 'test-token'
    const customUrl = 'https://custom.ndex.org'
    const client = getNdexClient(accessToken, customUrl)

    expect(mockGetNDExBaseUrl).not.toHaveBeenCalled()
    expect(MockNDExClient).toHaveBeenCalledWith({
      baseURL: customUrl,
    })
    expect(client.updateConfig).toHaveBeenCalledWith({
      auth: {
        type: 'oauth',
        idToken: accessToken,
      },
    })
  })

  it('should use custom URL when provided, even with default base URL available', () => {
    const customUrl = 'https://test.ndex.org'
    getNdexClient(undefined, customUrl)

    expect(MockNDExClient).toHaveBeenCalledWith({
      baseURL: customUrl,
    })
  })

  it('should not call updateConfig when access token is not provided', () => {
    const client = getNdexClient()

    expect(client.updateConfig).not.toHaveBeenCalled()
  })

  it('should handle URL override with access token', () => {
    const accessToken = 'token-123'
    const customUrl = 'https://override.ndex.org'
    const client = getNdexClient(accessToken, customUrl)

    expect(MockNDExClient).toHaveBeenCalledWith({
      baseURL: customUrl,
    })
    expect(client.updateConfig).toHaveBeenCalledWith({
      auth: {
        type: 'oauth',
        idToken: accessToken,
      },
    })
    expect(client.updateConfig).toHaveBeenCalledTimes(1)
  })
})
