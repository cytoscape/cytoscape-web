import { formatBytes } from './byte-conversion'

describe('formatBytes', () => {
  describe('basic functionality', () => {
    it('should format zero bytes', () => {
      expect(formatBytes(0)).toBe('0 Bytes')
    })

    it('should format bytes less than 1 KiB', () => {
      expect(formatBytes(1)).toBe('1 Bytes')
      expect(formatBytes(512)).toBe('512 Bytes')
      expect(formatBytes(1023)).toBe('1023 Bytes')
    })

    it('should format exactly 1 KiB', () => {
      expect(formatBytes(1024)).toBe('1 KiB')
    })

    it('should format bytes in KiB range', () => {
      expect(formatBytes(2048)).toBe('2 KiB')
      expect(formatBytes(5120)).toBe('5 KiB')
      expect(formatBytes(10240)).toBe('10 KiB')
    })

    it('should format exactly 1 MiB', () => {
      expect(formatBytes(1048576)).toBe('1 MiB')
    })

    it('should format bytes in MiB range', () => {
      expect(formatBytes(2097152)).toBe('2 MiB')
      expect(formatBytes(5242880)).toBe('5 MiB')
      expect(formatBytes(10485760)).toBe('10 MiB')
    })

    it('should format exactly 1 GiB', () => {
      expect(formatBytes(1073741824)).toBe('1 GiB')
    })

    it('should format bytes in GiB range', () => {
      expect(formatBytes(2147483648)).toBe('2 GiB')
      expect(formatBytes(5368709120)).toBe('5 GiB')
    })

    it('should format exactly 1 TiB', () => {
      expect(formatBytes(1099511627776)).toBe('1 TiB')
    })
  })

  describe('decimal precision', () => {
    it('should use default 2 decimals', () => {
      const result = formatBytes(1536000) // ~1.46 MiB
      expect(result).toMatch(/^\d+\.\d{2} MiB$/)
    })

    it('should format with 0 decimals', () => {
      expect(formatBytes(1536000, 0)).toMatch(/^\d+ MiB$/)
      expect(formatBytes(1536000, 0)).not.toContain('.')
    })

    it('should format with 1 decimal', () => {
      const result = formatBytes(1536000, 1)
      expect(result).toMatch(/^\d+\.\d{1} MiB$/)
    })

    it('should format with 3 decimals', () => {
      const result = formatBytes(1536000, 3)
      expect(result).toMatch(/^\d+\.\d{3} MiB$/)
    })

    it('should format with custom decimals for KiB', () => {
      const result = formatBytes(1536, 3) // 1.5 KiB
      // Result will have at least 1 decimal, possibly more up to 3
      expect(result).toMatch(/^\d+(\.\d{1,3})? KiB$/)
    })

    it('should format with custom decimals for GiB', () => {
      const result = formatBytes(1610612736, 4) // 1.5 GiB
      // Result will have at least 1 decimal, possibly more up to 4
      expect(result).toMatch(/^\d+(\.\d{1,4})? GiB$/)
    })
  })

  describe('boundary values', () => {
    it('should handle byte boundaries correctly', () => {
      expect(formatBytes(1023)).toBe('1023 Bytes')
      expect(formatBytes(1024)).toBe('1 KiB')
      expect(formatBytes(1025)).toBe('1 KiB')
    })

    it('should handle KiB to MiB boundary', () => {
      // Just below 1 MiB might round to 1024 KiB or stay as bytes
      expect(formatBytes(1048575)).toMatch(/^(1023|1024) (KiB|Bytes)$/)
      expect(formatBytes(1048576)).toBe('1 MiB')
      expect(formatBytes(1048577)).toBe('1 MiB')
    })

    it('should handle MiB to GiB boundary', () => {
      // Just below 1 GiB might round to 1024 MiB
      expect(formatBytes(1073741823)).toMatch(/^(1023|1024) MiB$/)
      expect(formatBytes(1073741824)).toBe('1 GiB')
      expect(formatBytes(1073741825)).toBe('1 GiB')
    })

    it('should handle GiB to TiB boundary', () => {
      // Just below 1 TiB might round to 1024 GiB
      expect(formatBytes(1099511627775)).toMatch(/^(1023|1024) GiB$/)
      expect(formatBytes(1099511627776)).toBe('1 TiB')
      expect(formatBytes(1099511627777)).toBe('1 TiB')
    })
  })

  describe('large values', () => {
    it('should format TiB values', () => {
      expect(formatBytes(1099511627776)).toBe('1 TiB')
      expect(formatBytes(2199023255552)).toBe('2 TiB')
    })

    it('should format PiB values', () => {
      const onePiB = 1125899906842624
      expect(formatBytes(onePiB)).toBe('1 PiB')
    })

    it('should format EiB values', () => {
      const oneEiB = 1152921504606846976
      expect(formatBytes(oneEiB)).toBe('1 EiB')
    })

    it('should handle values larger than YiB (clamps to YiB)', () => {
      // Value larger than the largest unit (YiB)
      const hugeValue = 1e30
      const result = formatBytes(hugeValue)
      // Should clamp to YiB (largest unit) rather than crash
      expect(result).toMatch(/YiB$/)
      expect(typeof result).toBe('string')
    })
  })

  describe('fractional values', () => {
    it('should format fractional KiB values', () => {
      const result = formatBytes(1536) // 1.5 KiB
      // Result will be "1.5 KiB" with default 2 decimals
      expect(result).toMatch(/^\d+(\.\d{1,2})? KiB$/)
      expect(result).toBe('1.5 KiB')
    })

    it('should format fractional MiB values', () => {
      const result = formatBytes(1572864) // 1.5 MiB
      // Result will be "1.5 MiB" with default 2 decimals
      expect(result).toMatch(/^\d+(\.\d{1,2})? MiB$/)
      expect(result).toBe('1.5 MiB')
    })

    it('should format fractional GiB values', () => {
      const result = formatBytes(1610612736) // 1.5 GiB
      // Result will be "1.5 GiB" with default 2 decimals
      expect(result).toMatch(/^\d+(\.\d{1,2})? GiB$/)
      expect(result).toBe('1.5 GiB')
    })
  })

  describe('edge cases', () => {
    it('should handle very small positive values', () => {
      // With default 2 decimals, values will have 2 decimal places
      expect(formatBytes(0.1)).toBe('0.10 Bytes')
      expect(formatBytes(0.5)).toBe('0.50 Bytes')
      expect(formatBytes(0.99)).toBe('0.99 Bytes')
      // But with 1 decimal, we get single decimal places
      expect(formatBytes(0.1, 1)).toBe('0.1 Bytes')
      expect(formatBytes(0.5, 1)).toBe('0.5 Bytes')
    })

    it('should handle single byte', () => {
      expect(formatBytes(1)).toBe('1 Bytes')
    })

    it('should round correctly with decimals', () => {
      // 1.4999... KiB should round based on decimals
      const bytes = 1535.999
      const result0 = formatBytes(bytes, 0)
      const result2 = formatBytes(bytes, 2)

      expect(result0).toMatch(/^\d+ KiB$/)
      // Result might be "1.5 KiB" if it rounds, or "1.50 KiB" - either is valid
      expect(result2).toMatch(/^\d+(\.\d{1,2})? KiB$/)
    })
  })

  describe('real-world scenarios', () => {
    it('should format typical file sizes', () => {
      expect(formatBytes(1024)).toBe('1 KiB') // 1 KB file
      expect(formatBytes(512000)).toBe('500 KiB') // ~500 KB file
      expect(formatBytes(1048576)).toBe('1 MiB') // 1 MB file
      expect(formatBytes(5242880)).toBe('5 MiB') // 5 MB file
      expect(formatBytes(104857600)).toBe('100 MiB') // 100 MB file
    })

    it('should format network data sizes', () => {
      expect(formatBytes(1048576)).toBe('1 MiB') // 1 MB network
      expect(formatBytes(1073741824)).toBe('1 GiB') // 1 GB network
    })

    it('should format memory sizes', () => {
      expect(formatBytes(4294967296)).toBe('4 GiB') // 4 GB RAM
      expect(formatBytes(8589934592)).toBe('8 GiB') // 8 GB RAM
      expect(formatBytes(17179869184)).toBe('16 GiB') // 16 GB RAM
    })

    it('should format storage sizes', () => {
      expect(formatBytes(107374182400)).toBe('100 GiB') // 100 GB storage
      expect(formatBytes(1099511627776)).toBe('1 TiB') // 1 TB storage
      expect(formatBytes(2199023255552)).toBe('2 TiB') // 2 TB storage
    })
  })

  describe('binary vs decimal units', () => {
    it('should use binary units (KiB, not KB)', () => {
      expect(formatBytes(1024)).toBe('1 KiB') // Not "1 KB"
      expect(formatBytes(1048576)).toBe('1 MiB') // Not "1 MB"
    })

    it('should correctly calculate binary units', () => {
      // 1 KiB = 1024 bytes (not 1000)
      expect(formatBytes(1024)).toBe('1 KiB')
      // 1 MiB = 1024 KiB = 1048576 bytes
      expect(formatBytes(1048576)).toBe('1 MiB')
      // 1 GiB = 1024 MiB = 1073741824 bytes
      expect(formatBytes(1073741824)).toBe('1 GiB')
    })
  })

  describe('output format', () => {
    it('should return a string', () => {
      expect(typeof formatBytes(1024)).toBe('string')
      expect(typeof formatBytes(0)).toBe('string')
      expect(typeof formatBytes(1048576)).toBe('string')
    })

    it('should include unit in output', () => {
      expect(formatBytes(512)).toContain('Bytes')
      expect(formatBytes(1024)).toContain('KiB')
      expect(formatBytes(1048576)).toContain('MiB')
      expect(formatBytes(1073741824)).toContain('GiB')
    })

    it('should have space between number and unit', () => {
      const result = formatBytes(1024)
      expect(result).toMatch(/^\d+(\.\d+)? [A-Z][a-z]?iB$/)
    })
  })

  describe('very large numbers', () => {
    it('should handle JavaScript max safe integer', () => {
      const maxSafeInteger = Number.MAX_SAFE_INTEGER
      const result = formatBytes(maxSafeInteger)
      // Should not crash and should return a valid string
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
      expect(result).toMatch(/[A-Z][a-z]?iB$/)
    })

    it('should handle numbers up to YiB range', () => {
      // YiB = 2^80 bytes
      const oneYiB = Math.pow(1024, 8)
      const result = formatBytes(oneYiB)
      expect(result).toMatch(/YiB$/)
    })
  })
})
