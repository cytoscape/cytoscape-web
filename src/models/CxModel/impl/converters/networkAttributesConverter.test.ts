import { Cx2 } from '../../Cx2'
import { createNetworkAttributesFromCx } from './networkAttributesConverter'

// to run these: npx jest src/models/CxModel/impl/converters/networkAttributesConverter.test.ts

describe('networkAttributesConverter', () => {
  // Helper function to create a minimal valid CX2 document
  const createMinimalValidCx = (): Cx2 => [
    {
      CXVersion: '2.0',
    },
    {
      status: [
        {
          success: true,
        },
      ],
    },
  ]

  describe('createNetworkAttributesFromCx', () => {
    it('should create empty network attributes from minimal CX2', () => {
      const networkId = 'test-network-1'
      const cx2 = createMinimalValidCx()

      const networkAttributes = createNetworkAttributesFromCx(networkId, cx2)

      expect(networkAttributes.id).toBe(networkId)
      expect(networkAttributes.attributes).toEqual({})
    })

    it('should create network attributes from CX2', () => {
      const networkId = 'test-network-2'
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          networkAttributes: [
            {
              name: 'Test Network',
              version: '1.0',
              description: 'A test network',
            },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const networkAttributes = createNetworkAttributesFromCx(networkId, cx2)

      expect(networkAttributes.id).toBe(networkId)
      expect(networkAttributes.attributes.name).toBe('Test Network')
      expect(networkAttributes.attributes.version).toBe('1.0')
      expect(networkAttributes.attributes.description).toBe('A test network')
    })

    it('should handle multiple network attribute entries', () => {
      const networkId = 'test-network-3'
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          networkAttributes: [
            {
              name: 'Test Network',
            },
            {
              version: '1.0',
            },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const networkAttributes = createNetworkAttributesFromCx(networkId, cx2)

      expect(networkAttributes.id).toBe(networkId)
      // Should merge attributes from all entries
      expect(networkAttributes.attributes.name).toBe('Test Network')
      expect(networkAttributes.attributes.version).toBe('1.0')
    })

    it('should handle empty network attributes array', () => {
      const networkId = 'test-network-4'
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          networkAttributes: [],
        },
        {
          status: [{ success: true }],
        },
      ]

      const networkAttributes = createNetworkAttributesFromCx(networkId, cx2)

      expect(networkAttributes.id).toBe(networkId)
      expect(networkAttributes.attributes).toEqual({})
    })

    it('should handle network attributes with various types', () => {
      const networkId = 'test-network-5'
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          networkAttributes: [
            {
              name: 'Test Network',
              version: '1.0',
              nodeCount: 10,
              edgeCount: 5,
              isActive: true,
              tags: ['tag1', 'tag2'],
            },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const networkAttributes = createNetworkAttributesFromCx(networkId, cx2)

      expect(networkAttributes.attributes.name).toBe('Test Network')
      expect(networkAttributes.attributes.version).toBe('1.0')
      expect(networkAttributes.attributes.nodeCount).toBe(10)
      expect(networkAttributes.attributes.edgeCount).toBe(5)
      expect(networkAttributes.attributes.isActive).toBe(true)
      expect(networkAttributes.attributes.tags).toEqual(['tag1', 'tag2'])
    })

    it('should merge attributes when multiple entries have overlapping keys', () => {
      const networkId = 'test-network-6'
      const cx2: Cx2 = [
        { CXVersion: '2.0' },
        {
          networkAttributes: [
            {
              name: 'Original Name',
              version: '1.0',
            },
            {
              name: 'Updated Name', // Should override previous name
              description: 'A description',
            },
          ],
        },
        {
          status: [{ success: true }],
        },
      ]

      const networkAttributes = createNetworkAttributesFromCx(networkId, cx2)

      // Later entries should override earlier ones
      expect(networkAttributes.attributes.name).toBe('Updated Name')
      expect(networkAttributes.attributes.version).toBe('1.0')
      expect(networkAttributes.attributes.description).toBe('A description')
    })

    it('should handle missing network attributes aspect', () => {
      const networkId = 'test-network-7'
      const cx2 = createMinimalValidCx()

      const networkAttributes = createNetworkAttributesFromCx(networkId, cx2)

      expect(networkAttributes.id).toBe(networkId)
      expect(networkAttributes.attributes).toEqual({})
    })
  })
})

