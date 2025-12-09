import { act, renderHook } from '@testing-library/react'

import { IdType } from '../../../models/IdType'
import { NetworkSummary } from '../../../models/NetworkSummaryModel/NetworkSummary'
import { useNetworkSummaryStore } from './NetworkSummaryStore'

// Mock the database operations to avoid IndexedDB issues in tests
jest.mock('../../db', () => ({
  ...jest.requireActual('../../db'),
  putNetworkSummaryToDb: jest.fn().mockResolvedValue(undefined),
  deleteNetworkSummaryFromDb: jest.fn().mockResolvedValue(undefined),
  clearNetworkSummaryFromDb: jest.fn().mockResolvedValue(undefined),
}))

describe('useNetworkSummaryStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    const { result } = renderHook(() => useNetworkSummaryStore())
    act(() => {
      result.current.deleteAll()
    })
  })

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
      description: 'Test network',
      creationTime: new Date(),
      externalId: networkId,
      isDeleted: false,
      modificationTime: new Date(),
    }
  }

  describe('add', () => {
    it('should add a summary for a network', () => {
      const { result } = renderHook(() => useNetworkSummaryStore())
      const networkId: IdType = 'network-1'
      const summary = createTestSummary(networkId)

      act(() => {
        result.current.add(networkId, summary)
      })

      expect(result.current.summaries[networkId]).toEqual(summary)
    })

    it('should handle multiple networks', () => {
      const { result } = renderHook(() => useNetworkSummaryStore())
      const networkId1: IdType = 'network-1'
      const networkId2: IdType = 'network-2'
      const summary1 = createTestSummary(networkId1)
      const summary2 = createTestSummary(networkId2)

      act(() => {
        result.current.add(networkId1, summary1)
        result.current.add(networkId2, summary2)
      })

      expect(result.current.summaries[networkId1]).toEqual(summary1)
      expect(result.current.summaries[networkId2]).toEqual(summary2)
    })
  })

  describe('addAll', () => {
    it('should add multiple summaries', () => {
      const { result } = renderHook(() => useNetworkSummaryStore())
      const summaries: Record<IdType, NetworkSummary> = {
        'network-1': createTestSummary('network-1'),
        'network-2': createTestSummary('network-2'),
      }

      act(() => {
        result.current.addAll(summaries)
      })

      expect(result.current.summaries['network-1']).toEqual(summaries['network-1'])
      expect(result.current.summaries['network-2']).toEqual(summaries['network-2'])
    })

    it('should merge with existing summaries', () => {
      const { result } = renderHook(() => useNetworkSummaryStore())
      const networkId1: IdType = 'network-1'
      const networkId2: IdType = 'network-2'

      act(() => {
        result.current.add(networkId1, createTestSummary(networkId1))
        result.current.addAll({
          [networkId2]: createTestSummary(networkId2),
        })
      })

      expect(result.current.summaries[networkId1]).toBeDefined()
      expect(result.current.summaries[networkId2]).toBeDefined()
    })
  })

  describe('update', () => {
    it('should update a summary', () => {
      const { result } = renderHook(() => useNetworkSummaryStore())
      const networkId: IdType = 'network-1'
      const summary = createTestSummary(networkId)

      act(() => {
        result.current.add(networkId, summary)
        result.current.update(networkId, { version: '2.0' })
      })

      expect(result.current.summaries[networkId].version).toBe('2.0')
      expect(result.current.summaries[networkId].externalId).toBe(networkId)
    })

    it('should not update if summary does not exist', () => {
      const { result } = renderHook(() => useNetworkSummaryStore())
      const networkId: IdType = 'network-1'

      act(() => {
        result.current.update(networkId, { version: '2.0' })
      })

      expect(result.current.summaries[networkId]).toBeUndefined()
    })
  })

  describe('delete', () => {
    it('should delete a summary for a network', () => {
      const { result } = renderHook(() => useNetworkSummaryStore())
      const networkId: IdType = 'network-1'
      const summary = createTestSummary(networkId)

      act(() => {
        result.current.add(networkId, summary)
        result.current.delete(networkId)
      })

      expect(result.current.summaries[networkId]).toBeUndefined()
    })

    it('should not affect other networks', () => {
      const { result } = renderHook(() => useNetworkSummaryStore())
      const networkId1: IdType = 'network-1'
      const networkId2: IdType = 'network-2'
      const summary1 = createTestSummary(networkId1)
      const summary2 = createTestSummary(networkId2)

      act(() => {
        result.current.add(networkId1, summary1)
        result.current.add(networkId2, summary2)
        result.current.delete(networkId1)
      })

      expect(result.current.summaries[networkId1]).toBeUndefined()
      expect(result.current.summaries[networkId2]).toEqual(summary2)
    })
  })

  describe('deleteAll', () => {
    it('should delete all summaries', () => {
      const { result } = renderHook(() => useNetworkSummaryStore())
      const networkId1: IdType = 'network-1'
      const networkId2: IdType = 'network-2'

      act(() => {
        result.current.add(networkId1, createTestSummary(networkId1))
        result.current.add(networkId2, createTestSummary(networkId2))
        result.current.deleteAll()
      })

      expect(result.current.summaries).toEqual({})
    })
  })

  describe('integration scenarios', () => {
    it('should handle complete workflow: add, update, delete', () => {
      const { result } = renderHook(() => useNetworkSummaryStore())
      const networkId: IdType = 'network-1'
      const summary = createTestSummary(networkId)

      act(() => {
        result.current.add(networkId, summary)
      })
      expect(result.current.summaries[networkId]).toEqual(summary)

      act(() => {
        result.current.update(networkId, { version: '3.0' })
      })
      expect(result.current.summaries[networkId].version).toBe('3.0')

      act(() => {
        result.current.delete(networkId)
      })
      expect(result.current.summaries[networkId]).toBeUndefined()
    })
  })
})

