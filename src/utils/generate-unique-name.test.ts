import { generateUniqueName } from './generate-unique-name'

describe('generateUniqueName', () => {
  describe('basic cases', () => {
    it('should return proposed name if it does not exist', () => {
      expect(generateUniqueName([], 'network')).toBe('network')
      expect(generateUniqueName(['other'], 'network')).toBe('network')
      expect(generateUniqueName(new Set(['other']), 'network')).toBe('network')
    })

    it('should append _1 if proposed name exists', () => {
      expect(generateUniqueName(['network'], 'network')).toBe('network_1')
      expect(generateUniqueName(new Set(['network']), 'network')).toBe(
        'network_1',
      )
    })

    it('should increment suffix until unique', () => {
      const existing = ['network', 'network_1', 'network_2']
      expect(generateUniqueName(existing, 'network')).toBe('network_3')
    })
  })

  describe('smart incrementing', () => {
    it('should start from highest existing number', () => {
      const existing = ['network_2', 'network_5', 'network_10']
      expect(generateUniqueName(existing, 'network')).toBe('network_11')
    })

    it('should find highest number even with gaps', () => {
      const existing = ['network_1', 'network_5', 'network_20']
      expect(generateUniqueName(existing, 'network')).toBe('network_21')
    })

    it('should handle single high number', () => {
      const existing = ['network_100']
      expect(generateUniqueName(existing, 'network')).toBe('network_101')
    })
  })

  describe('extracting base name from suffixed input', () => {
    it('should extract base name when proposed name already has suffix', () => {
      const existing = ['network_2']
      expect(generateUniqueName(existing, 'network_2')).toBe('network_3')
    })

    it('should not create double suffixes', () => {
      const existing = ['network_2']
      // Should not create "network_2_1", but "network_3"
      expect(generateUniqueName(existing, 'network_2')).toBe('network_3')
    })

    it('should extract base from multi-digit suffix', () => {
      const existing = ['network_10']
      expect(generateUniqueName(existing, 'network_10')).toBe('network_11')
    })

    it('should handle base name extraction with existing names', () => {
      const existing = ['network_1', 'network_5']
      expect(generateUniqueName(existing, 'network_5')).toBe('network_6')
    })
  })

  describe('edge cases', () => {
    it('should handle empty existing names', () => {
      expect(generateUniqueName([], 'network')).toBe('network')
      expect(generateUniqueName(new Set(), 'network')).toBe('network')
    })

    it('should handle names with underscores not ending in numbers', () => {
      const existing = ['network_data', 'network_data_1']
      expect(generateUniqueName(existing, 'network_data')).toBe(
        'network_data_2',
      )
    })

    it('should handle names that are just numbers', () => {
      const existing = ['123', '123_1']
      expect(generateUniqueName(existing, '123')).toBe('123_2')
    })

    it('should handle very large numbers', () => {
      const existing = ['network_999']
      expect(generateUniqueName(existing, 'network')).toBe('network_1000')
    })

    it('should handle special characters in base name', () => {
      const existing = ['network-v2', 'network-v2_1']
      expect(generateUniqueName(existing, 'network-v2')).toBe('network-v2_2')
    })

    it('should handle names with dots', () => {
      const existing = ['network.name', 'network.name_1']
      expect(generateUniqueName(existing, 'network.name')).toBe(
        'network.name_2',
      )
    })

    it('should handle names with spaces', () => {
      const existing = ['network name', 'network name_1']
      expect(generateUniqueName(existing, 'network name')).toBe(
        'network name_2',
      )
    })
  })

  describe('multiple existing names', () => {
    it('should find next available number with many existing names', () => {
      const existing = Array.from({ length: 50 }, (_, i) =>
        i === 0 ? 'network' : `network_${i}`,
      )
      expect(generateUniqueName(existing, 'network')).toBe('network_50')
    })

    it('should handle Set with many names', () => {
      const existing = new Set(
        Array.from({ length: 20 }, (_, i) => `network_${i + 1}`),
      )
      expect(generateUniqueName(existing, 'network')).toBe('network_21')
    })
  })

  describe('real-world scenarios', () => {
    it('should handle file upload scenario', () => {
      const existing = ['myfile.csv', 'myfile.csv_1', 'myfile.csv_3']
      expect(generateUniqueName(existing, 'myfile.csv')).toBe('myfile.csv_4')
    })

    it('should handle merge network scenario', () => {
      const existing = [
        'Merged Network',
        'Merged Network_1',
        'Merged Network_5',
      ]
      expect(generateUniqueName(existing, 'Merged Network')).toBe(
        'Merged Network_6',
      )
    })

    it('should handle column naming scenario', () => {
      const existing = ['name', 'name_1', 'name_2', 'name_4']
      expect(generateUniqueName(existing, 'name')).toBe('name_5')
    })
  })

  describe('performance with Set vs Array', () => {
    it('should work correctly with Set', () => {
      const existing = new Set(['network', 'network_1', 'network_2'])
      expect(generateUniqueName(existing, 'network')).toBe('network_3')
    })

    it('should work correctly with Array', () => {
      const existing = ['network', 'network_1', 'network_2']
      expect(generateUniqueName(existing, 'network')).toBe('network_3')
    })

    it('should produce same result for Set and Array', () => {
      const setNames = new Set(['network', 'network_1', 'network_5'])
      const arrayNames = ['network', 'network_1', 'network_5']

      expect(generateUniqueName(setNames, 'network')).toBe('network_6')
      expect(generateUniqueName(arrayNames, 'network')).toBe('network_6')
    })
  })

  describe('case sensitivity', () => {
    it('should treat names as case-sensitive', () => {
      const existing = ['Network', 'NETWORK']
      expect(generateUniqueName(existing, 'network')).toBe('network')
      expect(generateUniqueName(existing, 'Network')).toBe('Network_1')
    })
  })
})
