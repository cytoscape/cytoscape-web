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
  const MockNDExClient = NDExClient as import('vitest').MockedClass<
    typeof NDExClient
  >

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

  describe('sending the access token only to the configured host (#936)', () => {
    const TOKEN = 'test-token'
    const CONFIGURED = 'https://dev1.ndexbio.org'

    beforeEach(() => {
      mockGetNDExBaseUrl.mockReturnValue(CONFIGURED)
    })

    it.each([
      ['the same URL', 'https://dev1.ndexbio.org'],
      ['a bare host', 'dev1.ndexbio.org'],
      ['a trailing slash', 'https://dev1.ndexbio.org/'],
      ['an upper-case host', 'https://DEV1.NDEXBIO.ORG'],
      ['an upper-case scheme', 'HTTPS://dev1.ndexbio.org'],
      ['the default port', 'https://dev1.ndexbio.org:443'],
    ])('sends it to %s', (_label, url) => {
      const client = getNdexClient(TOKEN, url)

      expect(client.updateConfig).toHaveBeenCalledWith({
        auth: { type: 'oauth', idToken: TOKEN },
      })
    })

    it.each([
      ['another host', 'https://attacker.example'],
      ['another bare host', 'attacker.example'],
      ['a scheme downgrade', 'http://dev1.ndexbio.org'],
      ['another port', 'https://dev1.ndexbio.org:8443'],
      ['a look-alike suffix', 'dev1.ndexbio.org.attacker.example'],
      ['a look-alike prefix', 'attacker-dev1.ndexbio.org'],
      ['a sibling subdomain', 'https://evil.dev1.ndexbio.org'],
      ['a userinfo trick', 'https://dev1.ndexbio.org@attacker.example'],
      ['a host in the path', 'https://attacker.example/dev1.ndexbio.org'],
      ['a host in the query', 'https://attacker.example?dev1.ndexbio.org'],
      ['a host in the fragment', 'https://attacker.example#dev1.ndexbio.org'],
      ['a scheme-relative URL', '//attacker.example'],
      ['another scheme', 'ftp://dev1.ndexbio.org'],
      ['an empty value', ''],
      ['an unparseable value', 'https://not a host'],
    ])('withholds it from %s', (_label, url) => {
      const client = getNdexClient(TOKEN, url)

      expect(client.updateConfig).not.toHaveBeenCalled()
    })

    it.each([
      ['a number', 123],
      ['an object', { host: CONFIGURED }],
      ['a boolean', true],
    ])('withholds it from %s, as an HCX value can be', (_label, url) => {
      const client = getNdexClient(TOKEN, url as unknown as string)

      expect(client.updateConfig).not.toHaveBeenCalled()
    })

    it('still sends the request to the other host, anonymously', () => {
      getNdexClient(TOKEN, 'https://public.ndex.example')

      expect(MockNDExClient).toHaveBeenCalledWith({
        baseURL: 'https://public.ndex.example',
      })
    })

    it('sends it to any host when that host is the configured one', () => {
      mockGetNDExBaseUrl.mockReturnValue('http://localhost:8080')

      const client = getNdexClient(TOKEN, 'http://localhost:8080/')

      expect(client.updateConfig).toHaveBeenCalledTimes(1)
    })
  })
})
