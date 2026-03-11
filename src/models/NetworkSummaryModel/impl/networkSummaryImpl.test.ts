import { IdType } from '../../IdType'
import { NetworkSummary } from '../NetworkSummary'
import {
  add,
  addAll,
  createNetworkSummary,
  deleteAll,
  deleteSummary,
  NetworkSummaryState,
  update,
} from './networkSummaryImpl'

const createDefaultState = (): NetworkSummaryState => {
  return {
    summaries: {},
  }
}

const createTestSummary = (networkId: IdType): NetworkSummary => {
  return createNetworkSummary({
    networkId,
    name: `Network ${networkId}`,
    description: 'Test network',
    version: '1.0',
    owner: 'owner',
    ownerUUID: 'owner-1',
    isValid: true,
    completed: true,
    indexLevel: 'all',
    visibility: 'PUBLIC',
  })
}

describe('NetworkSummaryImpl', () => {
  describe('createNetworkSummary', () => {
    it('should create a summary with required networkId', () => {
      const networkId: IdType = 'network-1'
      const summary = createNetworkSummary({ networkId })

      expect(summary.externalId).toBe(networkId)
      expect(summary.ownerUUID).toBe(networkId)
      expect(summary.name).toBe('')
      expect(summary.description).toBe('')
      expect(summary.version).toBe('')
      expect(summary.isNdex).toBe(false)
      expect(summary.isReadOnly).toBe(false)
      expect(summary.isValid).toBe(false)
      expect(summary.completed).toBe(false)
      expect(summary.visibility).toBe('PUBLIC')
      expect(summary.nodeCount).toBe(0)
      expect(summary.edgeCount).toBe(0)
    })

    it('should create a summary with all options provided', () => {
      const networkId: IdType = 'network-1'
      const creationTime = new Date('2023-01-01')
      const modificationTime = new Date('2023-01-02')
      const summary = createNetworkSummary({
        networkId,
        name: 'Test Network',
        description: 'Test Description',
        version: '2.0',
        properties: [],
        hasLayout: true,
        visibility: 'PRIVATE',
        ownerUUID: 'owner-123',
        externalId: 'ext-123',
        isNdex: true,
        isReadOnly: true,
        subnetworkIds: [1, 2],
        isValid: true,
        warnings: ['warning1'],
        isShowcase: true,
        isCertified: true,
        indexLevel: 'all',
        hasSample: true,
        cxFileSize: 1000,
        cx2FileSize: 2000,
        owner: 'test-owner',
        completed: true,
        isDeleted: false,
        creationTime,
        modificationTime,
        nodeCount: 100,
        edgeCount: 200,
      })

      expect(summary.name).toBe('Test Network')
      expect(summary.description).toBe('Test Description')
      expect(summary.version).toBe('2.0')
      expect(summary.hasLayout).toBe(true)
      expect(summary.visibility).toBe('PRIVATE')
      expect(summary.ownerUUID).toBe('owner-123')
      expect(summary.externalId).toBe('ext-123')
      expect(summary.isNdex).toBe(true)
      expect(summary.isReadOnly).toBe(true)
      expect(summary.subnetworkIds).toEqual([1, 2])
      expect(summary.isValid).toBe(true)
      expect(summary.warnings).toEqual(['warning1'])
      expect(summary.isShowcase).toBe(true)
      expect(summary.isCertified).toBe(true)
      expect(summary.indexLevel).toBe('all')
      expect(summary.hasSample).toBe(true)
      expect(summary.cxFileSize).toBe(1000)
      expect(summary.cx2FileSize).toBe(2000)
      expect(summary.owner).toBe('test-owner')
      expect(summary.completed).toBe(true)
      expect(summary.isDeleted).toBe(false)
      expect(summary.creationTime).toBe(creationTime)
      expect(summary.modificationTime).toBe(modificationTime)
      expect(summary.nodeCount).toBe(100)
      expect(summary.edgeCount).toBe(200)
    })

    it('should use networkId as default for ownerUUID and externalId', () => {
      const networkId: IdType = 'network-1'
      const summary = createNetworkSummary({ networkId })

      expect(summary.ownerUUID).toBe(networkId)
      expect(summary.externalId).toBe(networkId)
    })

    it('should use provided ownerUUID and externalId when specified', () => {
      const networkId: IdType = 'network-1'
      const summary = createNetworkSummary({
        networkId,
        ownerUUID: 'custom-owner',
        externalId: 'custom-external',
      })

      expect(summary.ownerUUID).toBe('custom-owner')
      expect(summary.externalId).toBe('custom-external')
    })

    it('should use default values for optional fields', () => {
      const networkId: IdType = 'network-1'
      const summary = createNetworkSummary({ networkId })

      expect(summary.properties).toEqual([])
      expect(summary.subnetworkIds).toEqual([])
      expect(summary.warnings).toEqual([])
      expect(summary.hasLayout).toBe(false)
      expect(summary.hasSample).toBe(false)
      expect(summary.cxFileSize).toBe(0)
      expect(summary.cx2FileSize).toBe(0)
      expect(summary.isShowcase).toBe(false)
      expect(summary.isCertified).toBe(false)
      expect(summary.indexLevel).toBe('')
      expect(summary.owner).toBe('')
      expect(summary.completed).toBe(false)
      expect(summary.isDeleted).toBe(false)
      expect(summary.visibility).toBe('PUBLIC')
      expect(summary.nodeCount).toBe(0)
      expect(summary.edgeCount).toBe(0)
      expect(summary.creationTime).toBeInstanceOf(Date)
      expect(summary.modificationTime).toBeInstanceOf(Date)
    })

    it('should create unique Date instances for creationTime and modificationTime', () => {
      const networkId: IdType = 'network-1'
      const before = Date.now()
      const summary = createNetworkSummary({ networkId })
      const after = Date.now()

      expect(summary.creationTime.getTime()).toBeGreaterThanOrEqual(before)
      expect(summary.creationTime.getTime()).toBeLessThanOrEqual(after)
      expect(summary.modificationTime.getTime()).toBeGreaterThanOrEqual(before)
      expect(summary.modificationTime.getTime()).toBeLessThanOrEqual(after)
    })

    it('should use provided Date instances when specified', () => {
      const networkId: IdType = 'network-1'
      const creationTime = new Date('2023-01-01T00:00:00Z')
      const modificationTime = new Date('2023-01-02T00:00:00Z')
      const summary = createNetworkSummary({
        networkId,
        creationTime,
        modificationTime,
      })

      expect(summary.creationTime).toBe(creationTime)
      expect(summary.modificationTime).toBe(modificationTime)
    })
  })

  describe('add', () => {
    it('should add a summary for a network', () => {
      const state = createDefaultState()
      const networkId: IdType = 'network-1'
      const summary = createTestSummary(networkId)

      const result = add(state, networkId, summary)

      expect(result.summaries[networkId]).toEqual(summary)
      expect(result).not.toBe(state) // Immutability check
      expect(state.summaries[networkId]).toBeUndefined() // Original unchanged
    })

    it('should handle multiple networks', () => {
      const state = createDefaultState()
      const networkId1: IdType = 'network-1'
      const networkId2: IdType = 'network-2'
      const summary1 = createTestSummary(networkId1)
      const summary2 = createTestSummary(networkId2)

      let result = add(state, networkId1, summary1)
      result = add(result, networkId2, summary2)

      expect(result.summaries[networkId1]).toEqual(summary1)
      expect(result.summaries[networkId2]).toEqual(summary2)
    })
  })

  describe('addAll', () => {
    it('should add multiple summaries', () => {
      const state = createDefaultState()
      const summaries: Record<IdType, NetworkSummary> = {
        'network-1': createTestSummary('network-1'),
        'network-2': createTestSummary('network-2'),
      }

      const result = addAll(state, summaries)

      expect(result.summaries['network-1']).toEqual(summaries['network-1'])
      expect(result.summaries['network-2']).toEqual(summaries['network-2'])
      expect(result).not.toBe(state) // Immutability check
    })

    it('should merge with existing summaries', () => {
      const state = createDefaultState()
      const networkId1: IdType = 'network-1'
      const networkId2: IdType = 'network-2'

      let result = add(state, networkId1, createTestSummary(networkId1))
      result = addAll(result, {
        [networkId2]: createTestSummary(networkId2),
      })

      expect(result.summaries[networkId1]).toBeDefined()
      expect(result.summaries[networkId2]).toBeDefined()
    })
  })

  describe('update', () => {
    it('should update a summary', () => {
      const state = createDefaultState()
      const networkId: IdType = 'network-1'
      const summary = createTestSummary(networkId)

      let result = add(state, networkId, summary)
      result = update(result, networkId, { version: '2.0' })

      expect(result.summaries[networkId].version).toBe('2.0')
      expect(result.summaries[networkId].externalId).toBe(networkId)
      expect(result).not.toBe(state) // Immutability check
    })

    it('should not update if summary does not exist', () => {
      const state = createDefaultState()
      const networkId: IdType = 'network-1'

      const result = update(state, networkId, { version: '2.0' })

      expect(result).toBe(state) // Should return unchanged
      expect(result.summaries[networkId]).toBeUndefined()
    })
  })

  describe('deleteSummary', () => {
    it('should delete a summary for a network', () => {
      const state = createDefaultState()
      const networkId: IdType = 'network-1'
      const summary = createTestSummary(networkId)

      let result = add(state, networkId, summary)
      result = deleteSummary(result, networkId)

      expect(result.summaries[networkId]).toBeUndefined()
      expect(result).not.toBe(state) // Immutability check
    })

    it('should not affect other networks', () => {
      const state = createDefaultState()
      const networkId1: IdType = 'network-1'
      const networkId2: IdType = 'network-2'
      const summary1 = createTestSummary(networkId1)
      const summary2 = createTestSummary(networkId2)

      let result = add(state, networkId1, summary1)
      result = add(result, networkId2, summary2)
      result = deleteSummary(result, networkId1)

      expect(result.summaries[networkId1]).toBeUndefined()
      expect(result.summaries[networkId2]).toEqual(summary2)
    })
  })

  describe('deleteAll', () => {
    it('should delete all summaries', () => {
      const state = createDefaultState()
      const networkId1: IdType = 'network-1'
      const networkId2: IdType = 'network-2'

      let result = add(state, networkId1, createTestSummary(networkId1))
      result = add(result, networkId2, createTestSummary(networkId2))
      result = deleteAll(result)

      expect(result.summaries).toEqual({})
      expect(result).not.toBe(state) // Immutability check
    })
  })

  describe('immutability', () => {
    it('should not mutate the original state', () => {
      const original = createDefaultState()
      const originalSummaries = original.summaries

      let state = add(original, 'network-1', createTestSummary('network-1'))
      state = update(state, 'network-1', { version: '3.0' })
      state = deleteSummary(state, 'network-1')
      state = deleteAll(state)

      // Verify original is unchanged
      expect(original.summaries).toBe(originalSummaries)
      expect(original.summaries).toEqual({})
    })
  })
})
