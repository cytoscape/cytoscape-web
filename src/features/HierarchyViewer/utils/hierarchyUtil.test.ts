import { isSubnetwork } from './hierarchyUtil'

describe('isSubnetwork', () => {
  describe('returns true for subnetwork IDs', () => {
    it('should return true for IDs with underscore separator', () => {
      expect(isSubnetwork('hierarchyId_subsystemId')).toBe(true)
      expect(isSubnetwork('abc_123')).toBe(true)
      expect(isSubnetwork('network1_node1')).toBe(true)
      expect(isSubnetwork('parent_child')).toBe(true)
    })

    it('should return true for IDs with multiple underscores', () => {
      expect(isSubnetwork('hierarchy_subsystem_node')).toBe(true)
      expect(isSubnetwork('a_b_c')).toBe(true)
      expect(isSubnetwork('parent_child_grandchild')).toBe(true)
    })

    it('should return true for IDs starting or ending with underscore', () => {
      expect(isSubnetwork('_subsystemId')).toBe(true)
      expect(isSubnetwork('hierarchyId_')).toBe(true)
      expect(isSubnetwork('_')).toBe(true)
    })
  })

  describe('returns false for non-subnetwork IDs', () => {
    it('should return false for IDs without underscore', () => {
      expect(isSubnetwork('hierarchyId')).toBe(false)
      expect(isSubnetwork('abc')).toBe(false)
      expect(isSubnetwork('network123')).toBe(false)
      expect(isSubnetwork('simpleNetwork')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isSubnetwork('')).toBe(false)
    })

    it('should return false for single character IDs', () => {
      expect(isSubnetwork('a')).toBe(false)
      expect(isSubnetwork('1')).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle UUIDs without underscores', () => {
      expect(isSubnetwork('550e8400-e29b-41d4-a716-446655440000')).toBe(false)
    })

    it('should handle UUIDs with underscores (subnetworks)', () => {
      expect(
        isSubnetwork('550e8400-e29b-41d4-a716-446655440000_subsystem'),
      ).toBe(true)
    })

    it('should handle numeric IDs', () => {
      expect(isSubnetwork('123_456')).toBe(true)
      expect(isSubnetwork('123456')).toBe(false)
    })

    it('should handle special characters', () => {
      expect(isSubnetwork('network-id_sub-id')).toBe(true)
      expect(isSubnetwork('network.id_sub.id')).toBe(true)
      expect(isSubnetwork('network@id_sub@id')).toBe(true)
    })
  })
})

