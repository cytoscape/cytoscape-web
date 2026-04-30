import { detectBestDelimiter } from '../model/impl/DelimiterUtils'

describe('detectBestDelimiter utility', () => {
  it('detects comma-delimited files correctly even with quoted commas', () => {
    const csvContent = 'name,description,type\nA,"This is, node A",int\nB,"This is, node B",int'
    const result = detectBestDelimiter(csvContent)
    
    expect(result.meta.delimiter).toBe(',')
    // result.data should have 2 rows because of preview: 2
    expect(result.data).toHaveLength(2)
    // First data row is at index 1
    expect((result.data[1] as string[])).toHaveLength(3)
    expect((result.data[1] as string[])[1]).toBe('This is, node A')
  })

  it('prioritizes comma over space even if space results in more splits', () => {
    // In this case, space would split 'Graph Name' into two, but comma is higher priority
    const text = 'Graph Name,Description\nMy Network,This is a test'
    const result = detectBestDelimiter(text)
    
    expect(result.meta.delimiter).toBe(',')
    expect((result.data[0] as string[])).toHaveLength(2)
  })

  it('detects semicolons if commas are absent', () => {
    const text = 'id;name;value\n1;test;10.5'
    const result = detectBestDelimiter(text)
    
    expect(result.meta.delimiter).toBe(';')
    expect((result.data[0] as string[])).toHaveLength(3)
  })

  it('detects tabs correctly', () => {
    const text = 'id\tname\tvalue\n1\trow1\t100'
    const result = detectBestDelimiter(text)
    
    expect(result.meta.delimiter).toBe('\t')
    expect((result.data[0] as string[])).toHaveLength(3)
  })

  it('falls back to auto-detect if none of the priority list match', () => {
    // Pipe is not in the priority list [',', ';', '\t', ' ']
    const text = 'id|name|value\n1|row1|100'
    const result = detectBestDelimiter(text)
    
    expect(result.meta.delimiter).toBe('|')
    expect((result.data[0] as string[])).toHaveLength(3)
  })

  it('handles files with only one column gracefully', () => {
    const text = 'ColumnOnly\nValueOnly'
    const result = detectBestDelimiter(text)
    
    // Auto-detect will likely return undefined or some default
    expect((result.data[0] as string[])).toHaveLength(1)
  })
})
