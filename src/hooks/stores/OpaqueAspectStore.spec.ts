import { act, renderHook } from '@testing-library/react'

import { IdType } from '../../models/IdType'
import { OpaqueAspects } from '../../models/OpaqueAspectModel'
import { useOpaqueAspectStore } from './OpaqueAspectStore'

// Mock the database operations to avoid IndexedDB issues in tests
jest.mock('../../db', () => ({
  ...jest.requireActual('../../db'),
  putOpaqueAspectsToDb: jest.fn().mockResolvedValue(undefined),
  deleteOpaqueAspectsFromDb: jest.fn().mockResolvedValue(undefined),
}))

// Mock idb-keyval
jest.mock('idb-keyval', () => ({
  clear: jest.fn().mockResolvedValue(undefined),
}))

describe('useOpaqueAspectStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    const { result } = renderHook(() => useOpaqueAspectStore())
    act(() => {
      result.current.deleteAll()
    })
  })

  describe('add', () => {
    it('should add an aspect for a network', () => {
      const { result } = renderHook(() => useOpaqueAspectStore())
      const networkId: IdType = 'network-1'
      const aspectName = 'aspect-1'
      const aspectData = [{ id: 1, value: 'test' }]

      act(() => {
        result.current.add(networkId, aspectName, aspectData)
      })

      expect(result.current.opaqueAspects[networkId][aspectName]).toEqual(
        aspectData,
      )
    })

    it('should handle multiple aspects for the same network', () => {
      const { result } = renderHook(() => useOpaqueAspectStore())
      const networkId: IdType = 'network-1'

      act(() => {
        result.current.add(networkId, 'aspect-1', [{ id: 1 }])
        result.current.add(networkId, 'aspect-2', [{ id: 2 }])
      })

      expect(result.current.opaqueAspects[networkId]['aspect-1']).toEqual([
        { id: 1 },
      ])
      expect(result.current.opaqueAspects[networkId]['aspect-2']).toEqual([
        { id: 2 },
      ])
    })

    it('should handle multiple networks independently', () => {
      const { result } = renderHook(() => useOpaqueAspectStore())
      const networkId1: IdType = 'network-1'
      const networkId2: IdType = 'network-2'

      act(() => {
        result.current.add(networkId1, 'aspect-1', [{ id: 1 }])
        result.current.add(networkId2, 'aspect-1', [{ id: 2 }])
      })

      expect(result.current.opaqueAspects[networkId1]['aspect-1']).toEqual([
        { id: 1 },
      ])
      expect(result.current.opaqueAspects[networkId2]['aspect-1']).toEqual([
        { id: 2 },
      ])
    })
  })

  describe('addAll', () => {
    it('should add multiple aspects for a network', () => {
      const { result } = renderHook(() => useOpaqueAspectStore())
      const networkId: IdType = 'network-1'
      const aspects: OpaqueAspects[] = [
        { 'aspect-1': [{ id: 1 }] },
        { 'aspect-2': [{ id: 2 }] },
      ]

      act(() => {
        result.current.addAll(networkId, aspects)
      })

      expect(result.current.opaqueAspects[networkId]['aspect-1']).toEqual([
        { id: 1 },
      ])
      expect(result.current.opaqueAspects[networkId]['aspect-2']).toEqual([
        { id: 2 },
      ])
    })

    it('should update existing aspects when isUpdate is true', () => {
      const { result } = renderHook(() => useOpaqueAspectStore())
      const networkId: IdType = 'network-1'

      act(() => {
        result.current.add(networkId, 'aspect-1', [{ id: 1 }])
        result.current.addAll(
          networkId,
          [{ 'aspect-1': [{ id: 2 }] }, { 'aspect-2': [{ id: 3 }] }],
          true,
        )
      })

      expect(result.current.opaqueAspects[networkId]['aspect-1']).toEqual([
        { id: 2 },
      ])
      expect(result.current.opaqueAspects[networkId]['aspect-2']).toEqual([
        { id: 3 },
      ])
    })
  })

  describe('delete', () => {
    it('should delete all aspects for a network', () => {
      const { result } = renderHook(() => useOpaqueAspectStore())
      const networkId: IdType = 'network-1'

      act(() => {
        result.current.add(networkId, 'aspect-1', [{ id: 1 }])
        result.current.delete(networkId)
      })

      expect(result.current.opaqueAspects[networkId]).toBeUndefined()
    })

    it('should not affect other networks', () => {
      const { result } = renderHook(() => useOpaqueAspectStore())
      const networkId1: IdType = 'network-1'
      const networkId2: IdType = 'network-2'

      act(() => {
        result.current.add(networkId1, 'aspect-1', [{ id: 1 }])
        result.current.add(networkId2, 'aspect-1', [{ id: 2 }])
        result.current.delete(networkId1)
      })

      expect(result.current.opaqueAspects[networkId1]).toBeUndefined()
      expect(result.current.opaqueAspects[networkId2]['aspect-1']).toEqual([
        { id: 2 },
      ])
    })

    it('should handle undefined networkId gracefully', () => {
      const { result } = renderHook(() => useOpaqueAspectStore())

      act(() => {
        result.current.delete(undefined as any)
      })

      // Should not throw
      expect(result.current.opaqueAspects).toEqual({})
    })
  })

  describe('deleteSingleAspect', () => {
    it('should delete a single aspect for a network', () => {
      const { result } = renderHook(() => useOpaqueAspectStore())
      const networkId: IdType = 'network-1'

      act(() => {
        result.current.add(networkId, 'aspect-1', [{ id: 1 }])
        result.current.add(networkId, 'aspect-2', [{ id: 2 }])
        result.current.deleteSingleAspect(networkId, 'aspect-1')
      })

      expect(result.current.opaqueAspects[networkId]['aspect-1']).toBeUndefined()
      expect(result.current.opaqueAspects[networkId]['aspect-2']).toEqual([
        { id: 2 },
      ])
    })

    it('should handle non-existent aspect gracefully', () => {
      const { result } = renderHook(() => useOpaqueAspectStore())
      const networkId: IdType = 'network-1'

      act(() => {
        result.current.deleteSingleAspect(networkId, 'non-existent')
      })

      // Should not throw
      expect(result.current.opaqueAspects[networkId]).toBeUndefined()
    })
  })

  describe('clearAspects', () => {
    it('should clear all aspects for a network', () => {
      const { result } = renderHook(() => useOpaqueAspectStore())
      const networkId: IdType = 'network-1'

      act(() => {
        result.current.add(networkId, 'aspect-1', [{ id: 1 }])
        result.current.add(networkId, 'aspect-2', [{ id: 2 }])
        result.current.clearAspects(networkId)
      })

      expect(result.current.opaqueAspects[networkId]).toEqual({})
    })

    it('should not affect other networks', () => {
      const { result } = renderHook(() => useOpaqueAspectStore())
      const networkId1: IdType = 'network-1'
      const networkId2: IdType = 'network-2'

      act(() => {
        result.current.add(networkId1, 'aspect-1', [{ id: 1 }])
        result.current.add(networkId2, 'aspect-1', [{ id: 2 }])
        result.current.clearAspects(networkId1)
      })

      expect(result.current.opaqueAspects[networkId1]).toEqual({})
      expect(result.current.opaqueAspects[networkId2]['aspect-1']).toEqual([
        { id: 2 },
      ])
    })
  })

  describe('deleteAll', () => {
    it('should delete all aspects for all networks', () => {
      const { result } = renderHook(() => useOpaqueAspectStore())
      const networkId1: IdType = 'network-1'
      const networkId2: IdType = 'network-2'

      act(() => {
        result.current.add(networkId1, 'aspect-1', [{ id: 1 }])
        result.current.add(networkId2, 'aspect-1', [{ id: 2 }])
        result.current.deleteAll()
      })

      expect(result.current.opaqueAspects).toEqual({})
    })
  })

  describe('update', () => {
    it('should update an aspect for a network', () => {
      const { result } = renderHook(() => useOpaqueAspectStore())
      const networkId: IdType = 'network-1'

      act(() => {
        result.current.add(networkId, 'aspect-1', [{ id: 1 }])
        result.current.update(networkId, 'aspect-1', [{ id: 2 }])
      })

      expect(result.current.opaqueAspects[networkId]['aspect-1']).toEqual([
        { id: 2 },
      ])
    })

    it('should create aspect if it does not exist', () => {
      const { result } = renderHook(() => useOpaqueAspectStore())
      const networkId: IdType = 'network-1'

      act(() => {
        result.current.update(networkId, 'aspect-1', [{ id: 1 }])
      })

      expect(result.current.opaqueAspects[networkId]['aspect-1']).toEqual([
        { id: 1 },
      ])
    })

    it('should create a new array copy', () => {
      const { result } = renderHook(() => useOpaqueAspectStore())
      const networkId: IdType = 'network-1'
      const aspectData = [{ id: 1 }]

      act(() => {
        result.current.update(networkId, 'aspect-1', aspectData)
      })

      const stored = result.current.opaqueAspects[networkId]['aspect-1']
      expect(stored).toEqual(aspectData)
      expect(stored).not.toBe(aspectData) // Should be a copy
    })
  })

  describe('integration scenarios', () => {
    it('should handle complete workflow: add, update, delete single, clear, delete all', () => {
      const { result } = renderHook(() => useOpaqueAspectStore())
      const networkId: IdType = 'network-1'

      act(() => {
        result.current.add(networkId, 'aspect-1', [{ id: 1 }])
        result.current.update(networkId, 'aspect-1', [{ id: 2 }])
        result.current.add(networkId, 'aspect-2', [{ id: 3 }])
        result.current.deleteSingleAspect(networkId, 'aspect-1')
        result.current.clearAspects(networkId)
        result.current.add(networkId, 'aspect-3', [{ id: 4 }])
        result.current.deleteAll()
      })

      expect(result.current.opaqueAspects).toEqual({})
    })
  })
})

