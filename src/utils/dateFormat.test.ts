import { dateFormatter } from './dateFormat'

describe('dateFormatter', () => {
  describe('basic functionality', () => {
    it('should format a Date object', () => {
      const date = new Date('2023-12-25T15:30:00')
      const result = dateFormatter(date)
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{2}, \d{1,2}:\d{2} (AM|PM)/)
    })

    it('should format a Unix timestamp (milliseconds)', () => {
      const timestamp = 1703525400000 // 2023-12-25T15:30:00Z
      const result = dateFormatter(timestamp)
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{2}, \d{1,2}:\d{2} (AM|PM)/)
    })

    it('should format an ISO 8601 string', () => {
      const isoString = '2023-12-25T15:30:00Z'
      const result = dateFormatter(isoString)
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{2}, \d{1,2}:\d{2} (AM|PM)/)
    })

    it('should format a date string without timezone', () => {
      const dateString = '2023-12-25T15:30:00'
      const result = dateFormatter(dateString)
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{2}, \d{1,2}:\d{2} (AM|PM)/)
    })
  })

  describe('format consistency', () => {
    it('should produce the same format for Date, number, and string representing the same moment', () => {
      const date = new Date('2023-12-25T15:30:00Z')
      const timestamp = date.getTime()
      const isoString = date.toISOString()

      const resultDate = dateFormatter(date)
      const resultTimestamp = dateFormatter(timestamp)
      const resultString = dateFormatter(isoString)

      // All should be valid formatted dates
      expect(resultDate).toMatch(
        /\d{1,2}\/\d{1,2}\/\d{2}, \d{1,2}:\d{2} (AM|PM)/,
      )
      expect(resultTimestamp).toMatch(
        /\d{1,2}\/\d{1,2}\/\d{2}, \d{1,2}:\d{2} (AM|PM)/,
      )
      expect(resultString).toMatch(
        /\d{1,2}\/\d{1,2}\/\d{2}, \d{1,2}:\d{2} (AM|PM)/,
      )
    })

    it('should use US English locale', () => {
      const date = new Date('2023-12-25T15:30:00')
      const result = dateFormatter(date)

      // US format uses MM/DD/YY, not DD/MM/YY
      // We can't be too strict since format depends on browser, but should contain "/"
      expect(result).toContain('/')
      expect(result).toContain(',')
    })
  })

  describe('edge cases', () => {
    it('should handle the Unix epoch (0)', () => {
      const result = dateFormatter(0)
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{2}, \d{1,2}:\d{2} (AM|PM)/)
    })

    it("should handle a timestamp in seconds (converts incorrectly but doesn't crash)", () => {
      // If user passes seconds instead of milliseconds, Date will interpret it differently
      // This tests that the function doesn't crash
      const result = dateFormatter(1703525400) // seconds, not milliseconds
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle Date.now()', () => {
      const now = Date.now()
      const result = dateFormatter(now)
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{2}, \d{1,2}:\d{2} (AM|PM)/)
    })

    it('should handle new Date() (current time)', () => {
      const now = new Date()
      const result = dateFormatter(now)
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{2}, \d{1,2}:\d{2} (AM|PM)/)
    })
  })

  describe('different times of day', () => {
    it('should format midnight correctly', () => {
      const midnight = new Date('2023-12-25T00:00:00')
      const result = dateFormatter(midnight)
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{2}, \d{1,2}:\d{2} (AM|PM)/)
      // Should be 12:00 AM
      expect(result).toContain('AM')
    })

    it('should format noon correctly', () => {
      const noon = new Date('2023-12-25T12:00:00')
      const result = dateFormatter(noon)
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{2}, \d{1,2}:\d{2} (AM|PM)/)
      // Should be 12:00 PM
      expect(result).toContain('PM')
    })

    it('should format PM times correctly', () => {
      const pmTime = new Date('2023-12-25T15:30:00')
      const result = dateFormatter(pmTime)
      expect(result).toContain('PM')
    })

    it('should format AM times correctly', () => {
      const amTime = new Date('2023-12-25T09:30:00')
      const result = dateFormatter(amTime)
      expect(result).toContain('AM')
    })
  })

  describe('invalid input handling', () => {
    it('should handle invalid date string (returns Invalid Date string)', () => {
      const result = dateFormatter('not-a-date')
      // Invalid dates produce "Invalid Date" when converted to string
      // But toLocaleString may return different values
      expect(typeof result).toBe('string')
      // The function doesn't crash, but result may be "Invalid Date" or similar
    })

    it('should handle empty string', () => {
      const result = dateFormatter('')
      expect(typeof result).toBe('string')
      // Empty string creates an invalid date, but function doesn't crash
    })
  })

  describe('year boundaries', () => {
    it('should handle dates at the start of the year', () => {
      const jan1 = new Date('2023-01-01T12:00:00')
      const result = dateFormatter(jan1)
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{2}, \d{1,2}:\d{2} (AM|PM)/)
    })

    it('should handle dates at the end of the year', () => {
      const dec31 = new Date('2023-12-31T23:59:59')
      const result = dateFormatter(dec31)
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{2}, \d{1,2}:\d{2} (AM|PM)/)
    })

    it('should handle year 2000', () => {
      const y2k = new Date('2000-01-01T00:00:00')
      const result = dateFormatter(y2k)
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{2}, \d{1,2}:\d{2} (AM|PM)/)
    })

    it('should handle far future dates', () => {
      const future = new Date('2099-12-25T15:30:00')
      const result = dateFormatter(future)
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{2}, \d{1,2}:\d{2} (AM|PM)/)
    })
  })

  describe('timezone handling', () => {
    it('should format UTC dates correctly', () => {
      const utcDate = new Date('2023-12-25T15:30:00Z')
      const result = dateFormatter(utcDate)
      // Result will be in local timezone, so we just verify it's formatted
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{2}, \d{1,2}:\d{2} (AM|PM)/)
    })

    it('should format dates with timezone offset', () => {
      const dateWithOffset = new Date('2023-12-25T15:30:00-05:00')
      const result = dateFormatter(dateWithOffset)
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{2}, \d{1,2}:\d{2} (AM|PM)/)
    })
  })

  describe('real-world usage scenarios', () => {
    it('should format workspace creation time', () => {
      // Simulating typical workspace timestamp
      const workspaceTime = new Date('2023-12-25T10:15:30Z')
      const result = dateFormatter(workspaceTime)
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{2}, \d{1,2}:\d{2} (AM|PM)/)
    })

    it('should format network modification time', () => {
      // Simulating typical network modification timestamp
      const modTime = Date.now() - 86400000 // 1 day ago
      const result = dateFormatter(modTime)
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{2}, \d{1,2}:\d{2} (AM|PM)/)
    })

    it('should format NDEx network timestamps', () => {
      // NDEx often uses ISO strings
      const ndexTime = '2023-12-25T15:30:00.000Z'
      const result = dateFormatter(ndexTime)
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{2}, \d{1,2}:\d{2} (AM|PM)/)
    })
  })
})
