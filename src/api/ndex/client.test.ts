import { getNdexClient } from './client'
import { getNDExBaseUrl } from './config'

// Mock the NDEx client module
jest.mock('@js4cytoscape/ndex-client', () => {
  return {
    NDEx: jest.fn().mockImplementation((url: string) => {
      return {
        url,
        setAuthToken: jest.fn(),
      }
    }),
  }
})

// Mock the config module
jest.mock('./config', () => ({
  getNDExBaseUrl: jest.fn(() => 'https://default.ndex.org'),
}))

describe('getNdexClient', () => {
  const mockGetNDExBaseUrl = getNDExBaseUrl as jest.MockedFunction<
    typeof getNDExBaseUrl
  >

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetNDExBaseUrl.mockReturnValue('https://default.ndex.org')
  })

  it('should create a client with default URL when no URL is provided', () => {
    const client = getNdexClient()

    expect(mockGetNDExBaseUrl).toHaveBeenCalled()
    expect(client.url).toBe('https://default.ndex.org')
  })

  it('should create a client with provided URL', () => {
    const customUrl = 'https://custom.ndex.org'
    const client = getNdexClient(undefined, customUrl)

    expect(mockGetNDExBaseUrl).not.toHaveBeenCalled()
    expect(client.url).toBe(customUrl)
  })

  it('should create a client with access token and default URL', () => {
    const accessToken = 'test-token'
    const client = getNdexClient(accessToken)

    expect(mockGetNDExBaseUrl).toHaveBeenCalled()
    expect(client.url).toBe('https://default.ndex.org')
    expect(client.setAuthToken).toHaveBeenCalledWith(accessToken)
  })

  it('should create a client with access token and custom URL', () => {
    const accessToken = 'test-token'
    const customUrl = 'https://custom.ndex.org'
    const client = getNdexClient(accessToken, customUrl)

    expect(mockGetNDExBaseUrl).not.toHaveBeenCalled()
    expect(client.url).toBe(customUrl)
    expect(client.setAuthToken).toHaveBeenCalledWith(accessToken)
  })

  it('should use custom URL when provided, even with default base URL available', () => {
    const customUrl = 'https://test.ndex.org'
    const client = getNdexClient(undefined, customUrl)

    expect(client.url).toBe(customUrl)
    // Verify default URL wasn't used
    expect(client.url).not.toBe('https://default.ndex.org')
  })

  it('should not set auth token when not provided', () => {
    const client = getNdexClient()

    expect(client.setAuthToken).not.toHaveBeenCalled()
  })

  it('should handle URL override with access token', () => {
    const accessToken = 'token-123'
    const customUrl = 'https://override.ndex.org'
    const client = getNdexClient(accessToken, customUrl)

    expect(client.url).toBe(customUrl)
    expect(client.setAuthToken).toHaveBeenCalledWith(accessToken)
    expect(client.setAuthToken).toHaveBeenCalledTimes(1)
  })
})
