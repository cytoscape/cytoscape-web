import { NetworkSummary } from '../../models/NetworkSummaryModel'
import { NetworkProperty } from '../../models/NetworkSummaryModel/NetworkProperty'
import { ValueTypeName } from '../../models/TableModel/ValueTypeName'
import { waitSeconds } from '../../utils/wait-seconds'
import { getNdexClient } from './client'
import { NdexNetworkSummary } from './NdexNetworkSummary'
import {
  fetchNdexSummaries,
  getNetworkValidationStatus,
  normalizeNdexSummaries,
} from './network-summary'

// Mock dependencies
jest.mock('./client', () => ({
  getNdexClient: jest.fn(),
}))

jest.mock('../../utils/wait-seconds', () => ({
  waitSeconds: jest.fn().mockResolvedValue(undefined),
}))

describe('normalizeNdexSummaries', () => {
  const createBaseSummary = (): NdexNetworkSummary => ({
    ownerUUID: 'owner-123',
    isReadOnly: false,
    subnetworkIds: [],
    isValid: true,
    warnings: [],
    isShowcase: false,
    isCertified: false,
    indexLevel: 'full',
    hasLayout: true,
    hasSample: false,
    cxFileSize: 1000,
    cx2FileSize: 500,
    name: 'Test Network',
    properties: [],
    owner: 'test-owner',
    version: '1.0',
    completed: true,
    visibility: 'public',
    nodeCount: 10,
    edgeCount: 20,
    description: 'Test description',
    creationTime: new Date('2023-01-01T00:00:00Z'),
    externalId: 'network-123',
    isDeleted: false,
    modificationTime: new Date('2023-01-02T00:00:00Z'),
  })

  describe('property value type conversions', () => {
    it('should convert String type to string', () => {
      const summary = createBaseSummary()
      summary.properties = [
        {
          subNetworkId: null,
          value: 'test string',
          predicateString: 'name',
          dataType: ValueTypeName.String,
        },
      ]

      const result = normalizeNdexSummaries([summary])

      expect(result[0].properties[0].value).toBe('test string')
      expect(typeof result[0].properties[0].value).toBe('string')
    })

    it('should convert Integer type to number', () => {
      const summary = createBaseSummary()
      summary.properties = [
        {
          subNetworkId: null,
          value: '42',
          predicateString: 'count',
          dataType: ValueTypeName.Integer,
        },
      ]

      const result = normalizeNdexSummaries([summary])

      expect(result[0].properties[0].value).toBe(42)
      expect(typeof result[0].properties[0].value).toBe('number')
    })

    it('should convert Long type to number', () => {
      const summary = createBaseSummary()
      summary.properties = [
        {
          subNetworkId: null,
          value: '1234567890',
          predicateString: 'id',
          dataType: ValueTypeName.Long,
        },
      ]

      const result = normalizeNdexSummaries([summary])

      expect(result[0].properties[0].value).toBe(1234567890)
      expect(typeof result[0].properties[0].value).toBe('number')
    })

    it('should convert Double type to number', () => {
      const summary = createBaseSummary()
      summary.properties = [
        {
          subNetworkId: null,
          value: '3.14159',
          predicateString: 'pi',
          dataType: ValueTypeName.Double,
        },
      ]

      const result = normalizeNdexSummaries([summary])

      expect(result[0].properties[0].value).toBe(3.14159)
      expect(typeof result[0].properties[0].value).toBe('number')
    })

    it('should convert Boolean type to boolean', () => {
      const summary = createBaseSummary()
      summary.properties = [
        {
          subNetworkId: null,
          value: 'true',
          predicateString: 'isActive',
          dataType: ValueTypeName.Boolean,
        },
        {
          subNetworkId: null,
          value: 'false',
          predicateString: 'isInactive',
          dataType: ValueTypeName.Boolean,
        },
      ]

      const result = normalizeNdexSummaries([summary])

      expect(result[0].properties[0].value).toBe(true)
      expect(typeof result[0].properties[0].value).toBe('boolean')
      expect(result[0].properties[1].value).toBe(false)
      expect(typeof result[0].properties[1].value).toBe('boolean')
    })

    it('should convert ListString type to array of strings', () => {
      const summary = createBaseSummary()
      summary.properties = [
        {
          subNetworkId: null,
          value: '["one", "two", "three"]',
          predicateString: 'tags',
          dataType: ValueTypeName.ListString,
        },
      ]

      const result = normalizeNdexSummaries([summary])

      expect(result[0].properties[0].value).toEqual(['one', 'two', 'three'])
      expect(Array.isArray(result[0].properties[0].value)).toBe(true)
    })

    it('should convert ListInteger type to array of numbers', () => {
      const summary = createBaseSummary()
      summary.properties = [
        {
          subNetworkId: null,
          value: '["1", "2", "3"]',
          predicateString: 'counts',
          dataType: ValueTypeName.ListInteger,
        },
      ]

      const result = normalizeNdexSummaries([summary])

      expect(result[0].properties[0].value).toEqual([1, 2, 3])
      expect(Array.isArray(result[0].properties[0].value)).toBe(true)
    })

    it('should convert ListLong type to array of numbers', () => {
      const summary = createBaseSummary()
      summary.properties = [
        {
          subNetworkId: null,
          value: '["100", "200", "300"]',
          predicateString: 'ids',
          dataType: ValueTypeName.ListLong,
        },
      ]

      const result = normalizeNdexSummaries([summary])

      expect(result[0].properties[0].value).toEqual([100, 200, 300])
    })

    it('should convert ListDouble type to array of numbers', () => {
      const summary = createBaseSummary()
      summary.properties = [
        {
          subNetworkId: null,
          value: '["1.1", "2.2", "3.3"]',
          predicateString: 'values',
          dataType: ValueTypeName.ListDouble,
        },
      ]

      const result = normalizeNdexSummaries([summary])

      expect(result[0].properties[0].value).toEqual([1.1, 2.2, 3.3])
    })

    it('should convert ListBoolean type to array of booleans', () => {
      const summary = createBaseSummary()
      summary.properties = [
        {
          subNetworkId: null,
          value: '["true", "false", "true"]',
          predicateString: 'flags',
          dataType: ValueTypeName.ListBoolean,
        },
      ]

      const result = normalizeNdexSummaries([summary])

      expect(result[0].properties[0].value).toEqual([true, false, true])
      expect((result[0].properties[0].value as unknown as boolean[])[0]).toBe(
        true,
      )
      expect(
        typeof (result[0].properties[0].value as unknown as boolean[])[0],
      ).toBe('boolean')
    })

    it('should handle unknown data types by preserving value', () => {
      const summary = createBaseSummary()
      summary.properties = [
        {
          subNetworkId: null,
          value: 'unknown-value',
          predicateString: 'custom',
          dataType: 'UnknownType' as ValueTypeName,
        },
      ]

      const result = normalizeNdexSummaries([summary])

      expect(result[0].properties[0].value).toBe('unknown-value')
    })
  })

  describe('summary metadata processing', () => {
    it('should set isNdex to true', () => {
      const summary = createBaseSummary()

      const result = normalizeNdexSummaries([summary])

      expect(result[0].isNdex).toBe(true)
    })

    it('should provide default values for optional fields', () => {
      const summary = createBaseSummary()
      summary.version = undefined as any
      summary.description = undefined as any
      summary.name = undefined as any

      const result = normalizeNdexSummaries([summary])

      expect(result[0].version).toBe('')
      expect(result[0].description).toBe('')
      expect(result[0].name).toBe('')
    })

    it('should preserve existing values for optional fields', () => {
      const summary = createBaseSummary()
      summary.version = '2.0'
      summary.description = 'Custom description'
      summary.name = 'Custom name'

      const result = normalizeNdexSummaries([summary])

      expect(result[0].version).toBe('2.0')
      expect(result[0].description).toBe('Custom description')
      expect(result[0].name).toBe('Custom name')
    })

    it('should convert creationTime to Date object', () => {
      const summary = createBaseSummary()
      summary.creationTime = '2023-01-01T00:00:00Z' as any

      const result = normalizeNdexSummaries([summary])

      expect(result[0].creationTime).toBeInstanceOf(Date)
      expect(result[0].creationTime.getTime()).toBe(
        new Date('2023-01-01T00:00:00Z').getTime(),
      )
    })

    it('should convert modificationTime to Date object', () => {
      const summary = createBaseSummary()
      summary.modificationTime = '2023-01-02T00:00:00Z' as any

      const result = normalizeNdexSummaries([summary])

      expect(result[0].modificationTime).toBeInstanceOf(Date)
      expect(result[0].modificationTime.getTime()).toBe(
        new Date('2023-01-02T00:00:00Z').getTime(),
      )
    })

    it('should preserve all other summary fields', () => {
      const summary = createBaseSummary()
      summary.ownerUUID = 'owner-456'
      summary.nodeCount = 100
      summary.edgeCount = 200
      summary.externalId = 'external-789'

      const result = normalizeNdexSummaries([summary])

      expect(result[0].ownerUUID).toBe('owner-456')
      expect(result[0].nodeCount).toBe(100)
      expect(result[0].edgeCount).toBe(200)
      expect(result[0].externalId).toBe('external-789')
    })
  })

  describe('multiple summaries', () => {
    it('should process multiple summaries', () => {
      const summary1 = createBaseSummary()
      summary1.externalId = 'network-1'
      summary1.name = 'Network 1'

      const summary2 = createBaseSummary()
      summary2.externalId = 'network-2'
      summary2.name = 'Network 2'

      const result = normalizeNdexSummaries([summary1, summary2])

      expect(result).toHaveLength(2)
      expect(result[0].externalId).toBe('network-1')
      expect(result[0].name).toBe('Network 1')
      expect(result[1].externalId).toBe('network-2')
      expect(result[1].name).toBe('Network 2')
    })

    it('should process summaries with different property types', () => {
      const summary1 = createBaseSummary()
      summary1.properties = [
        {
          subNetworkId: null,
          value: '42',
          predicateString: 'count',
          dataType: ValueTypeName.Integer,
        },
      ]

      const summary2 = createBaseSummary()
      summary2.properties = [
        {
          subNetworkId: null,
          value: 'true',
          predicateString: 'active',
          dataType: ValueTypeName.Boolean,
        },
      ]

      const result = normalizeNdexSummaries([summary1, summary2])

      expect(result[0].properties[0].value).toBe(42)
      expect(result[1].properties[0].value).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle empty properties array', () => {
      const summary = createBaseSummary()
      summary.properties = []

      const result = normalizeNdexSummaries([summary])

      expect(result[0].properties).toEqual([])
      expect(result[0].isNdex).toBe(true)
    })

    it('should handle empty list values', () => {
      const summary = createBaseSummary()
      summary.properties = [
        {
          subNetworkId: null,
          value: '[]',
          predicateString: 'emptyList',
          dataType: ValueTypeName.ListString,
        },
      ]

      const result = normalizeNdexSummaries([summary])

      expect(result[0].properties[0].value).toEqual([])
    })

    it('should handle numeric string conversion edge cases', () => {
      const summary = createBaseSummary()
      summary.properties = [
        {
          subNetworkId: null,
          value: '0',
          predicateString: 'zero',
          dataType: ValueTypeName.Integer,
        },
        {
          subNetworkId: null,
          value: '-42',
          predicateString: 'negative',
          dataType: ValueTypeName.Integer,
        },
        {
          subNetworkId: null,
          value: '3.14',
          predicateString: 'pi',
          dataType: ValueTypeName.Double,
        },
      ]

      const result = normalizeNdexSummaries([summary])

      expect(result[0].properties[0].value).toBe(0)
      expect(result[0].properties[1].value).toBe(-42)
      expect(result[0].properties[2].value).toBe(3.14)
    })

    it('should handle boolean string variations', () => {
      const summary = createBaseSummary()
      summary.properties = [
        {
          subNetworkId: null,
          value: 'true',
          predicateString: 'trueVal',
          dataType: ValueTypeName.Boolean,
        },
        {
          subNetworkId: null,
          value: 'false',
          predicateString: 'falseVal',
          dataType: ValueTypeName.Boolean,
        },
        {
          subNetworkId: null,
          value: 'other',
          predicateString: 'otherVal',
          dataType: ValueTypeName.Boolean,
        },
      ]

      const result = normalizeNdexSummaries([summary])

      expect(result[0].properties[0].value).toBe(true)
      expect(result[0].properties[1].value).toBe(false)
      expect(result[0].properties[2].value).toBe(false) // 'other' !== 'true'
    })

    it('should handle Date conversion from various formats', () => {
      const summary1 = createBaseSummary()
      summary1.creationTime = new Date('2023-01-01') as any

      const summary2 = createBaseSummary()
      summary2.creationTime = '2023-01-01T12:00:00.000Z' as any

      const result = normalizeNdexSummaries([summary1, summary2])

      expect(result[0].creationTime).toBeInstanceOf(Date)
      expect(result[1].creationTime).toBeInstanceOf(Date)
    })

    it('should handle invalid JSON string for list types', () => {
      const summary = createBaseSummary()
      summary.properties = [
        {
          subNetworkId: null,
          value: 'not valid json',
          predicateString: 'invalid',
          dataType: ValueTypeName.ListString,
        },
      ]

      const result = normalizeNdexSummaries([summary])

      // Should return empty array for invalid JSON
      expect(result[0].properties[0].value).toEqual([])
      expect(Array.isArray(result[0].properties[0].value)).toBe(true)
    })

    it('should handle non-array JSON for list types', () => {
      const summary = createBaseSummary()
      summary.properties = [
        {
          subNetworkId: null,
          value: '{"key": "value"}', // Valid JSON but not an array
          predicateString: 'object',
          dataType: ValueTypeName.ListString,
        },
        {
          subNetworkId: null,
          value: '"just a string"', // Valid JSON but not an array
          predicateString: 'string',
          dataType: ValueTypeName.ListInteger,
        },
        {
          subNetworkId: null,
          value: '123', // Valid JSON number but not an array
          predicateString: 'number',
          dataType: ValueTypeName.ListBoolean,
        },
      ]

      const result = normalizeNdexSummaries([summary])

      // Should return empty array when parsed JSON is not an array
      expect(result[0].properties[0].value).toEqual([])
      expect(result[0].properties[1].value).toEqual([])
      expect(result[0].properties[2].value).toEqual([])
    })
  })

  describe('property preservation', () => {
    it('should preserve property metadata while converting values', () => {
      const summary = createBaseSummary()
      summary.properties = [
        {
          subNetworkId: 'subnet-123',
          value: '42',
          predicateString: 'myProperty',
          dataType: ValueTypeName.Integer,
        },
      ]

      const result = normalizeNdexSummaries([summary])

      expect(result[0].properties[0].subNetworkId).toBe('subnet-123')
      expect(result[0].properties[0].predicateString).toBe('myProperty')
      expect(result[0].properties[0].dataType).toBe(ValueTypeName.Integer)
      expect(result[0].properties[0].value).toBe(42) // Converted
    })
  })
})

describe('fetchNdexSummaries', () => {
  const mockGetNdexClient = getNdexClient as jest.MockedFunction<
    typeof getNdexClient
  >
  const mockWaitSeconds = waitSeconds as jest.MockedFunction<typeof waitSeconds>

  const createBaseSummary = (): NdexNetworkSummary => ({
    ownerUUID: 'owner-123',
    isReadOnly: false,
    subnetworkIds: [],
    isValid: true,
    warnings: [],
    isShowcase: false,
    isCertified: false,
    indexLevel: 'full',
    hasLayout: true,
    hasSample: false,
    cxFileSize: 1000,
    cx2FileSize: 500,
    name: 'Test Network',
    properties: [],
    owner: 'test-owner',
    version: '1.0',
    completed: true,
    visibility: 'public',
    nodeCount: 10,
    edgeCount: 20,
    description: 'Test description',
    creationTime: new Date('2023-01-01T00:00:00Z'),
    externalId: 'network-123',
    isDeleted: false,
    modificationTime: new Date('2023-01-02T00:00:00Z'),
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockWaitSeconds.mockResolvedValue(undefined)
  })

  it('should fetch a single network summary by ID', async () => {
    const mockNetworkId = 'test-network-uuid-123'
    const mockAccessToken = 'test-access-token'
    const rawSummary = createBaseSummary()
    rawSummary.externalId = mockNetworkId

    const mockClient = {
      getNetworkSummariesByUUIDs: jest.fn().mockResolvedValue([rawSummary]),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await fetchNdexSummaries(mockNetworkId, mockAccessToken)

    expect(mockGetNdexClient).toHaveBeenCalledWith(mockAccessToken, undefined)
    expect(mockClient.getNetworkSummariesByUUIDs).toHaveBeenCalledWith([
      mockNetworkId,
    ])
    expect(result).toHaveLength(1)
    expect(result[0].externalId).toBe(mockNetworkId)
    expect(result[0].isNdex).toBe(true) // Should be normalized
  })

  it('should fetch multiple network summaries by IDs', async () => {
    const mockNetworkIds = ['network-1', 'network-2', 'network-3']
    const rawSummaries = mockNetworkIds.map((id, index) => {
      const summary = createBaseSummary()
      summary.externalId = id
      summary.name = `Network ${index + 1}`
      return summary
    })

    const mockClient = {
      getNetworkSummariesByUUIDs: jest.fn().mockResolvedValue(rawSummaries),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await fetchNdexSummaries(mockNetworkIds)

    expect(mockGetNdexClient).toHaveBeenCalledWith(undefined, undefined)
    expect(mockClient.getNetworkSummariesByUUIDs).toHaveBeenCalledWith(
      mockNetworkIds,
    )
    expect(result).toHaveLength(3)
    expect(result[0].externalId).toBe('network-1')
    expect(result[1].externalId).toBe('network-2')
    expect(result[2].externalId).toBe('network-3')
    result.forEach((summary) => {
      expect(summary.isNdex).toBe(true)
    })
  })

  it('should handle arrays with single ID', async () => {
    const mockNetworkId = 'single-network-uuid'
    const rawSummary = createBaseSummary()
    rawSummary.externalId = mockNetworkId

    const mockClient = {
      getNetworkSummariesByUUIDs: jest.fn().mockResolvedValue([rawSummary]),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await fetchNdexSummaries([mockNetworkId])

    expect(mockClient.getNetworkSummariesByUUIDs).toHaveBeenCalledWith([
      mockNetworkId,
    ])
    expect(result).toHaveLength(1)
  })

  it('should normalize summaries after fetching', async () => {
    const mockNetworkId = 'normalize-test-uuid'
    const rawSummary = createBaseSummary()
    rawSummary.externalId = mockNetworkId
    rawSummary.version = undefined as any
    rawSummary.description = undefined as any
    rawSummary.properties = [
      {
        subNetworkId: null,
        value: '42',
        predicateString: 'count',
        dataType: ValueTypeName.Integer,
      },
    ]

    const mockClient = {
      getNetworkSummariesByUUIDs: jest.fn().mockResolvedValue([rawSummary]),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await fetchNdexSummaries(mockNetworkId)

    expect(result[0].isNdex).toBe(true)
    expect(result[0].version).toBe('') // Default value
    expect(result[0].description).toBe('') // Default value
    expect(result[0].properties[0].value).toBe(42) // Normalized to number
  })

  it('should propagate errors from the NDEx client', async () => {
    const mockNetworkId = 'error-network-uuid'
    const mockError = new Error('Network not found')

    const mockClient = {
      getNetworkSummariesByUUIDs: jest.fn().mockRejectedValue(mockError),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    await expect(fetchNdexSummaries(mockNetworkId)).rejects.toThrow(
      'Network not found',
    )

    expect(mockGetNdexClient).toHaveBeenCalledWith(undefined, undefined)
    expect(mockClient.getNetworkSummariesByUUIDs).toHaveBeenCalledWith([
      mockNetworkId,
    ])
  })

  it('should work without an access token', async () => {
    const mockNetworkId = 'public-network-uuid'
    const rawSummary = createBaseSummary()
    rawSummary.externalId = mockNetworkId

    const mockClient = {
      getNetworkSummariesByUUIDs: jest.fn().mockResolvedValue([rawSummary]),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await fetchNdexSummaries(mockNetworkId)

    expect(mockGetNdexClient).toHaveBeenCalledWith(undefined, undefined)
    expect(result).toHaveLength(1)
  })

  it('should fetch summaries with custom NDEx URL', async () => {
    const mockNetworkId = 'test-network-uuid-custom-url'
    const mockAccessToken = 'test-access-token'
    const mockNdexUrl = 'https://custom.ndex.org'
    const rawSummary = createBaseSummary()
    rawSummary.externalId = mockNetworkId

    const mockClient = {
      getNetworkSummariesByUUIDs: jest.fn().mockResolvedValue([rawSummary]),
      setAuthToken: jest.fn(),
    }

    mockGetNdexClient.mockReturnValue(mockClient as any)

    const result = await fetchNdexSummaries(
      mockNetworkId,
      mockAccessToken,
      mockNdexUrl,
    )

    expect(mockGetNdexClient).toHaveBeenCalledWith(mockAccessToken, mockNdexUrl)
    expect(result).toHaveLength(1)
    expect(result[0].externalId).toBe(mockNetworkId)
  })
})

describe('getNetworkValidationStatus', () => {
  const mockGetNdexClient = getNdexClient as jest.MockedFunction<
    typeof getNdexClient
  >
  const mockWaitSeconds = waitSeconds as jest.MockedFunction<typeof waitSeconds>

  const createValidSummary = (): NdexNetworkSummary => ({
    ownerUUID: 'owner-123',
    isReadOnly: false,
    subnetworkIds: [],
    isValid: true,
    warnings: [],
    isShowcase: false,
    isCertified: false,
    indexLevel: 'full',
    hasLayout: true,
    hasSample: false,
    cxFileSize: 1000,
    cx2FileSize: 500,
    name: 'Valid Network',
    properties: [],
    owner: 'test-owner',
    version: '1.0',
    completed: true,
    visibility: 'public',
    nodeCount: 10,
    edgeCount: 20,
    description: 'Test description',
    creationTime: new Date('2023-01-01T00:00:00Z'),
    externalId: 'network-123',
    isDeleted: false,
    modificationTime: new Date('2023-01-02T00:00:00Z'),
    errorMessage: undefined,
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockWaitSeconds.mockResolvedValue(undefined)
  })

  it('should return true when network is valid on first attempt', async () => {
    const mockUuid = 'valid-network-uuid'
    const mockAccessToken = 'test-token'
    const validSummary = createValidSummary()
    validSummary.externalId = mockUuid
    validSummary.completed = true
    validSummary.errorMessage = undefined

    // Mock fetchNdexSummaries to return valid summary
    jest.spyOn(require('./network-summary'), 'fetchNdexSummaries')
    const mockFetchSummaries = jest.fn().mockResolvedValue([validSummary])
    require('./network-summary').fetchNdexSummaries = mockFetchSummaries

    const result = await getNetworkValidationStatus(mockUuid, mockAccessToken)

    expect(result).toBe(true)
    expect(mockWaitSeconds).toHaveBeenCalledWith(0.5) // initialDelaySeconds
    expect(mockFetchSummaries).toHaveBeenCalledWith(
      mockUuid,
      mockAccessToken,
      undefined,
    )
  })

  it('should validate network with custom NDEx URL', async () => {
    const mockUuid = 'valid-network-uuid-custom-url'
    const mockAccessToken = 'test-token'
    const mockNdexUrl = 'https://custom.ndex.org'
    const validSummary = createValidSummary()
    validSummary.externalId = mockUuid
    validSummary.completed = true
    validSummary.errorMessage = undefined

    jest.spyOn(require('./network-summary'), 'fetchNdexSummaries')
    const mockFetchSummaries = jest.fn().mockResolvedValue([validSummary])
    require('./network-summary').fetchNdexSummaries = mockFetchSummaries

    const result = await getNetworkValidationStatus(
      mockUuid,
      mockAccessToken,
      mockNdexUrl,
    )

    expect(result).toBe(true)
    expect(mockFetchSummaries).toHaveBeenCalledWith(
      mockUuid,
      mockAccessToken,
      mockNdexUrl,
    )
  })

  it('should return true when network becomes valid after retries', async () => {
    const mockUuid = 'retry-network-uuid'
    const mockAccessToken = 'test-token'
    const invalidSummary = createValidSummary()
    invalidSummary.completed = false
    const validSummary = createValidSummary()
    validSummary.completed = true
    validSummary.errorMessage = undefined

    // Mock fetchNdexSummaries to return invalid then valid
    jest.spyOn(require('./network-summary'), 'fetchNdexSummaries')
    const mockFetchSummaries = jest
      .fn()
      .mockResolvedValueOnce([invalidSummary])
      .mockResolvedValueOnce([validSummary])
    require('./network-summary').fetchNdexSummaries = mockFetchSummaries

    const result = await getNetworkValidationStatus(
      mockUuid,
      mockAccessToken,
      undefined,
      {
        maxAttempts: 3,
        initialDelaySeconds: 0.1,
        delaySeconds: 0.1,
      },
    )

    expect(result).toBe(true)
    expect(mockFetchSummaries).toHaveBeenCalledTimes(2)
    expect(mockFetchSummaries).toHaveBeenCalledWith(
      mockUuid,
      mockAccessToken,
      undefined,
    )
    expect(mockWaitSeconds).toHaveBeenCalledWith(0.1) // initialDelaySeconds
    expect(mockWaitSeconds).toHaveBeenCalledWith(0.1) // delaySeconds after first attempt
  })

  it('should return false when network validation fails after max attempts', async () => {
    const mockUuid = 'invalid-network-uuid'
    const mockAccessToken = 'test-token'
    const invalidSummary = createValidSummary()
    invalidSummary.completed = false
    invalidSummary.errorMessage = 'Validation failed'

    // Mock fetchNdexSummaries to always return invalid
    jest.spyOn(require('./network-summary'), 'fetchNdexSummaries')
    const mockFetchSummaries = jest.fn().mockResolvedValue([invalidSummary])
    require('./network-summary').fetchNdexSummaries = mockFetchSummaries

    const result = await getNetworkValidationStatus(
      mockUuid,
      mockAccessToken,
      undefined,
      {
        maxAttempts: 3,
        initialDelaySeconds: 0.1,
        delaySeconds: 0.1,
      },
    )

    expect(result).toBe(false)
    expect(mockFetchSummaries).toHaveBeenCalledTimes(3)
    expect(mockWaitSeconds).toHaveBeenCalledTimes(3) // initialDelay + 2 delays
  })

  it('should return false when network has error message', async () => {
    const mockUuid = 'error-network-uuid'
    const mockAccessToken = 'test-token'
    const errorSummary = createValidSummary()
    errorSummary.completed = true
    errorSummary.errorMessage = 'Network has errors'

    jest.spyOn(require('./network-summary'), 'fetchNdexSummaries')
    const mockFetchSummaries = jest.fn().mockResolvedValue([errorSummary])
    require('./network-summary').fetchNdexSummaries = mockFetchSummaries

    const result = await getNetworkValidationStatus(
      mockUuid,
      mockAccessToken,
      undefined,
      {
        maxAttempts: 2,
        initialDelaySeconds: 0.1,
        delaySeconds: 0.1,
      },
    )

    expect(result).toBe(false)
    expect(mockFetchSummaries).toHaveBeenCalledTimes(2)
  })

  it('should retry on errors and eventually return false', async () => {
    const mockUuid = 'error-prone-network-uuid'
    const mockAccessToken = 'test-token'
    const mockError = new Error('Network fetch failed')

    jest.spyOn(require('./network-summary'), 'fetchNdexSummaries')
    const mockFetchSummaries = jest.fn().mockRejectedValue(mockError)
    require('./network-summary').fetchNdexSummaries = mockFetchSummaries

    const result = await getNetworkValidationStatus(
      mockUuid,
      mockAccessToken,
      undefined,
      {
        maxAttempts: 3,
        initialDelaySeconds: 0.1,
        delaySeconds: 0.1,
      },
    )

    expect(result).toBe(false)
    expect(mockFetchSummaries).toHaveBeenCalledTimes(3)
    expect(mockWaitSeconds).toHaveBeenCalledTimes(3) // initialDelay + 2 delays
  })

  it('should use default options when none provided', async () => {
    const mockUuid = 'default-options-uuid'
    const mockAccessToken = 'test-token'
    const validSummary = createValidSummary()
    validSummary.completed = true

    jest.spyOn(require('./network-summary'), 'fetchNdexSummaries')
    const mockFetchSummaries = jest.fn().mockResolvedValue([validSummary])
    require('./network-summary').fetchNdexSummaries = mockFetchSummaries

    const result = await getNetworkValidationStatus(mockUuid, mockAccessToken)

    expect(result).toBe(true)
    expect(mockWaitSeconds).toHaveBeenCalledWith(0.5) // default initialDelaySeconds
    // Since network is valid on first attempt, delaySeconds is never called
    expect(mockWaitSeconds).toHaveBeenCalledTimes(1)
  })

  it('should not wait after last attempt', async () => {
    const mockUuid = 'last-attempt-uuid'
    const mockAccessToken = 'test-token'
    const invalidSummary = createValidSummary()
    invalidSummary.completed = false

    jest.spyOn(require('./network-summary'), 'fetchNdexSummaries')
    const mockFetchSummaries = jest.fn().mockResolvedValue([invalidSummary])
    require('./network-summary').fetchNdexSummaries = mockFetchSummaries

    await getNetworkValidationStatus(mockUuid, mockAccessToken, undefined, {
      maxAttempts: 2,
      initialDelaySeconds: 0.1,
      delaySeconds: 0.1,
    })

    // Should wait initialDelay + delay after first attempt, but NOT after last attempt
    expect(mockWaitSeconds).toHaveBeenCalledTimes(2) // initialDelay + 1 delay (not 2)
  })

  it('should handle empty summary array', async () => {
    const mockUuid = 'empty-summary-uuid'
    const mockAccessToken = 'test-token'

    jest.spyOn(require('./network-summary'), 'fetchNdexSummaries')
    const mockFetchSummaries = jest.fn().mockResolvedValue([])
    require('./network-summary').fetchNdexSummaries = mockFetchSummaries

    const result = await getNetworkValidationStatus(
      mockUuid,
      mockAccessToken,
      undefined,
      {
        maxAttempts: 2,
        initialDelaySeconds: 0.1,
        delaySeconds: 0.1,
      },
    )

    expect(result).toBe(false)
    expect(mockFetchSummaries).toHaveBeenCalledTimes(2)
  })
})
