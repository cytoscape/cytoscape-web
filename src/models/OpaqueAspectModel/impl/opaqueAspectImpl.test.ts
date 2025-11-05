import { IdType } from '../../IdType'
import { OpaqueAspects } from '../OpaqueAspects'
import {
  add,
  addAll,
  clearAspects,
  deleteAll,
  deleteAspects,
  deleteSingleAspect,
  OpaqueAspectState,
  update,
} from './opaqueAspectImpl'

const createDefaultState = (): OpaqueAspectState => {
  return {
    opaqueAspects: {},
  }
}

describe('OpaqueAspectImpl', () => {
  describe('add', () => {
    it('should add an aspect for a network', () => {
      const state = createDefaultState()
      const networkId: IdType = 'network-1'
      const aspectName = 'aspect-1'
      const aspectData = [{ id: 1, value: 'test' }]

      const result = add(state, networkId, aspectName, aspectData)

      expect(result.opaqueAspects[networkId][aspectName]).toEqual(aspectData)
      expect(result).not.toBe(state) // Immutability check
      expect(state.opaqueAspects[networkId]).toBeUndefined() // Original unchanged
    })

    it('should handle multiple aspects for the same network', () => {
      const state = createDefaultState()
      const networkId: IdType = 'network-1'

      let result = add(state, networkId, 'aspect-1', [{ id: 1 }])
      result = add(result, networkId, 'aspect-2', [{ id: 2 }])

      expect(result.opaqueAspects[networkId]['aspect-1']).toEqual([{ id: 1 }])
      expect(result.opaqueAspects[networkId]['aspect-2']).toEqual([{ id: 2 }])
    })
  })

  describe('addAll', () => {
    it('should add multiple aspects for a network', () => {
      const state = createDefaultState()
      const networkId: IdType = 'network-1'
      const aspects: OpaqueAspects[] = [
        { 'aspect-1': [{ id: 1 }] },
        { 'aspect-2': [{ id: 2 }] },
      ]

      const result = addAll(state, networkId, aspects)

      expect(result.opaqueAspects[networkId]['aspect-1']).toEqual([{ id: 1 }])
      expect(result.opaqueAspects[networkId]['aspect-2']).toEqual([{ id: 2 }])
      expect(result).not.toBe(state) // Immutability check
    })

    it('should update existing aspects when isUpdate is true', () => {
      const state = createDefaultState()
      const networkId: IdType = 'network-1'

      let result = add(state, networkId, 'aspect-1', [{ id: 1 }])
      result = addAll(
        result,
        networkId,
        [{ 'aspect-1': [{ id: 2 }] }, { 'aspect-2': [{ id: 3 }] }],
        true,
      )

      expect(result.opaqueAspects[networkId]['aspect-1']).toEqual([{ id: 2 }])
      expect(result.opaqueAspects[networkId]['aspect-2']).toEqual([{ id: 3 }])
    })
  })

  describe('deleteAspects', () => {
    it('should delete all aspects for a network', () => {
      const state = createDefaultState()
      const networkId: IdType = 'network-1'

      let result = add(state, networkId, 'aspect-1', [{ id: 1 }])
      result = deleteAspects(result, networkId)

      expect(result.opaqueAspects[networkId]).toBeUndefined()
      expect(result).not.toBe(state) // Immutability check
    })

    it('should handle undefined networkId gracefully', () => {
      const state = createDefaultState()

      const result = deleteAspects(state, undefined as any)

      expect(result).toBe(state) // Should return unchanged
    })
  })

  describe('deleteSingleAspect', () => {
    it('should delete a single aspect for a network', () => {
      const state = createDefaultState()
      const networkId: IdType = 'network-1'

      let result = add(state, networkId, 'aspect-1', [{ id: 1 }])
      result = add(result, networkId, 'aspect-2', [{ id: 2 }])
      result = deleteSingleAspect(result, networkId, 'aspect-1')

      expect(result.opaqueAspects[networkId]['aspect-1']).toBeUndefined()
      expect(result.opaqueAspects[networkId]['aspect-2']).toEqual([{ id: 2 }])
      expect(result).not.toBe(state) // Immutability check
    })

    it('should handle non-existent aspect gracefully', () => {
      const state = createDefaultState()
      const networkId: IdType = 'network-1'

      const result = deleteSingleAspect(state, networkId, 'non-existent')

      expect(result).toBe(state) // Should return unchanged
    })
  })

  describe('clearAspects', () => {
    it('should clear all aspects for a network', () => {
      const state = createDefaultState()
      const networkId: IdType = 'network-1'

      let result = add(state, networkId, 'aspect-1', [{ id: 1 }])
      result = add(result, networkId, 'aspect-2', [{ id: 2 }])
      result = clearAspects(result, networkId)

      expect(result.opaqueAspects[networkId]).toEqual({})
      expect(result).not.toBe(state) // Immutability check
    })
  })

  describe('deleteAll', () => {
    it('should delete all aspects for all networks', () => {
      const state = createDefaultState()
      const networkId1: IdType = 'network-1'
      const networkId2: IdType = 'network-2'

      let result = add(state, networkId1, 'aspect-1', [{ id: 1 }])
      result = add(result, networkId2, 'aspect-1', [{ id: 2 }])
      result = deleteAll(result)

      expect(result.opaqueAspects).toEqual({})
      expect(result).not.toBe(state) // Immutability check
    })
  })

  describe('update', () => {
    it('should update an aspect for a network', () => {
      const state = createDefaultState()
      const networkId: IdType = 'network-1'

      let result = add(state, networkId, 'aspect-1', [{ id: 1 }])
      result = update(result, networkId, 'aspect-1', [{ id: 2 }])

      expect(result.opaqueAspects[networkId]['aspect-1']).toEqual([{ id: 2 }])
      expect(result).not.toBe(state) // Immutability check
    })

    it('should create aspect if it does not exist', () => {
      const state = createDefaultState()
      const networkId: IdType = 'network-1'

      const result = update(state, networkId, 'aspect-1', [{ id: 1 }])

      expect(result.opaqueAspects[networkId]['aspect-1']).toEqual([{ id: 1 }])
    })

    it('should create a new array copy', () => {
      const state = createDefaultState()
      const networkId: IdType = 'network-1'
      const aspectData = [{ id: 1 }]

      const result = update(state, networkId, 'aspect-1', aspectData)

      const stored = result.opaqueAspects[networkId]['aspect-1']
      expect(stored).toEqual(aspectData)
      expect(stored).not.toBe(aspectData) // Should be a copy
    })
  })

  describe('immutability', () => {
    it('should not mutate the original state', () => {
      const original = createDefaultState()
      const originalOpaqueAspects = original.opaqueAspects

      let state = add(original, 'network-1', 'aspect-1', [{ id: 1 }])
      state = addAll(state, 'network-1', [{ 'aspect-2': [{ id: 2 }] }])
      state = update(state, 'network-1', 'aspect-1', [{ id: 3 }])
      state = deleteSingleAspect(state, 'network-1', 'aspect-2')
      state = clearAspects(state, 'network-1')
      state = deleteAll(state)

      // Verify original is unchanged
      expect(original.opaqueAspects).toBe(originalOpaqueAspects)
      expect(original.opaqueAspects).toEqual({})
    })
  })
})

