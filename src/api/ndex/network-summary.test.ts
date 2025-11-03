import { normalizeNdexSummaries } from './network-summary'
import { NdexNetworkSummary } from '../../models/NetworkSummaryModel'
import { NdexNetworkProperty } from '../../models/NetworkSummaryModel/NdexNetworkProperty'
import { ValueTypeName } from '../../models/TableModel/ValueTypeName'

describe('normalizeNdexSummaries', () => {
  const createBaseSummary = (): NdexNetworkSummary => ({
    isNdex: false,
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
      summary.isNdex = false

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
