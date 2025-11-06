import { IdType } from '../../IdType'
import { NetworkSummary } from '../NetworkSummary'
import {
  add,
  addAll,
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
  return {
    isNdex: false,
    ownerUUID: 'owner-1',
    isReadOnly: false,
    subnetworkIds: [],
    isValid: true,
    warnings: [],
    isShowcase: false,
    isCertified: false,
    indexLevel: 'all',
    hasLayout: false,
    hasSample: false,
    cxFileSize: 0,
    cx2FileSize: 0,
    name: `Network ${networkId}`,
    properties: [],
    owner: 'owner',
    version: '1.0',
    completed: true,
    visibility: 'PUBLIC',
    nodeCount: 10,
    edgeCount: 20,
    description: 'Test network',
    creationTime: new Date(),
    externalId: networkId,
    isDeleted: false,
    modificationTime: new Date(),
  }
}

describe('NetworkSummaryImpl', () => {
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
      result = update(result, networkId, { nodeCount: 20 })

      expect(result.summaries[networkId].nodeCount).toBe(20)
      expect(result.summaries[networkId].externalId).toBe(networkId)
      expect(result).not.toBe(state) // Immutability check
    })

    it('should not update if summary does not exist', () => {
      const state = createDefaultState()
      const networkId: IdType = 'network-1'

      const result = update(state, networkId, { nodeCount: 20 })

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
      state = update(state, 'network-1', { nodeCount: 30 })
      state = deleteSummary(state, 'network-1')
      state = deleteAll(state)

      // Verify original is unchanged
      expect(original.summaries).toBe(originalSummaries)
      expect(original.summaries).toEqual({})
    })
  })
})
