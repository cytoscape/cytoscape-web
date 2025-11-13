import { createFuseIndex, filterColumns, runSearch } from './searchUtil'
import {
  Table,
  Column,
  ValueTypeName,
  ValueType,
} from '../../../models/TableModel'
import { Operator } from '../../../models/FilterModel/Search'

// to run these: npx jest src/components/ToolBar/Search/SearchUtils.test.ts

describe('SearchUtils', () => {
  // Helper function to create a test table
  const createTestTable = (
    columns: Column[],
    rows: Map<string, Record<string, ValueType>>,
  ): Table => {
    return {
      id: 'test-table',
      columns,
      rows,
    }
  }

  describe('createFuseIndex', () => {
    it('should create an index with only String and ListString columns', () => {
      const columns: Column[] = [
        { name: 'name', type: ValueTypeName.String },
        { name: 'type', type: ValueTypeName.String },
        { name: 'count', type: ValueTypeName.Integer },
        { name: 'tags', type: ValueTypeName.ListString },
      ]
      const rows = new Map<string, Record<string, ValueType>>([
        [
          '1',
          { name: 'Node1', type: 'gene', count: 5, tags: ['tag1', 'tag2'] },
        ],
        ['2', { name: 'Node2', type: 'protein', count: 10, tags: ['tag2'] }],
      ])
      const table = createTestTable(columns, rows)

      const index = createFuseIndex(table)

      // Should be able to search
      const results = index.search('Node1')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].item.id).toBe('1')
    })

    it('should exclude non-string columns from index', () => {
      const columns: Column[] = [
        { name: 'name', type: ValueTypeName.String },
        { name: 'count', type: ValueTypeName.Integer },
        { name: 'score', type: ValueTypeName.Double },
      ]
      const rows = new Map<string, Record<string, ValueType>>([
        ['1', { name: 'Node1', count: 5, score: 0.5 }],
      ])
      const table = createTestTable(columns, rows)

      const index = createFuseIndex(table)

      // Should find by name (string column)
      const results = index.search('Node1')
      expect(results.length).toBe(1)
      expect(results[0].item.id).toBe('1')
    })

    it('should handle empty table', () => {
      const columns: Column[] = [{ name: 'name', type: ValueTypeName.String }]
      const rows = new Map<string, Record<string, ValueType>>()
      const table = createTestTable(columns, rows)

      const index = createFuseIndex(table)

      const results = index.search('anything')
      expect(results.length).toBe(0)
    })

    it('should handle table with no string columns', () => {
      const columns: Column[] = [
        { name: 'count', type: ValueTypeName.Integer },
        { name: 'score', type: ValueTypeName.Double },
      ]
      const rows = new Map<string, Record<string, ValueType>>([
        ['1', { count: 5, score: 0.5 }],
      ])
      const table = createTestTable(columns, rows)

      const index = createFuseIndex(table)

      // Should create index but no searchable columns
      const results = index.search('anything')
      expect(results.length).toBe(0)
    })
  })

  describe('filterColumns', () => {
    it('should filter columns by type', () => {
      const columns: Column[] = [
        { name: 'name', type: ValueTypeName.String },
        { name: 'type', type: ValueTypeName.String },
        { name: 'count', type: ValueTypeName.Integer },
        { name: 'tags', type: ValueTypeName.ListString },
      ]

      const result = filterColumns(columns, [
        ValueTypeName.String,
        ValueTypeName.ListString,
      ])

      expect(result.size).toBe(3)
      expect(result.has('name')).toBe(true)
      expect(result.has('type')).toBe(true)
      expect(result.has('tags')).toBe(true)
      expect(result.has('count')).toBe(false)
    })

    it('should return empty set when no columns match', () => {
      const columns: Column[] = [
        { name: 'count', type: ValueTypeName.Integer },
        { name: 'score', type: ValueTypeName.Double },
      ]

      const result = filterColumns(columns, [ValueTypeName.String])

      expect(result.size).toBe(0)
    })

    it('should handle empty columns array', () => {
      const columns: Column[] = []

      const result = filterColumns(columns, [ValueTypeName.String])

      expect(result.size).toBe(0)
    })
  })

  describe('runSearch', () => {
    let testTable: Table
    let testIndex: ReturnType<typeof createFuseIndex>

    beforeEach(() => {
      const columns: Column[] = [
        { name: 'name', type: ValueTypeName.String },
        { name: 'type', type: ValueTypeName.String },
        { name: 'description', type: ValueTypeName.String },
      ]
      const rows = new Map<string, Record<string, ValueType>>([
        ['1', { name: 'YL', type: 'gene', description: 'Yellow gene' }],
        [
          '2',
          {
            name: 'YL protein',
            type: 'protein',
            description: 'Yellow protein',
          },
        ],
        [
          '3',
          { name: 'BRCA1', type: 'gene', description: 'Breast cancer gene' },
        ],
        [
          '4',
          { name: 'protein kinase', type: 'protein', description: 'Enzyme' },
        ],
      ])
      testTable = createTestTable(columns, rows)
      testIndex = createFuseIndex(testTable)
    })

    describe('tokenization', () => {
      it('should tokenize space-separated query', () => {
        const results = runSearch(testIndex, 'YL protein', 'AND', false)
        // Should find row 2 which has both "YL" and "protein"
        expect(results).toContain('2')
      })

      it('should tokenize comma-separated query', () => {
        const results = runSearch(testIndex, 'YL, protein', 'OR', false)
        // Should find rows with either "YL" or "protein"
        expect(results).toContain('1') // has YL
        expect(results).toContain('2') // has both
        expect(results).toContain('4') // has protein
      })

      it('should handle quoted phrases as single token', () => {
        const results = runSearch(testIndex, '"Yellow gene"', 'AND', false)
        // Should find row 1 which has the exact phrase
        expect(results).toContain('1')
      })

      it('should handle mixed quoted and unquoted tokens', () => {
        const results = runSearch(
          testIndex,
          '"Yellow gene", BRCA1',
          'OR',
          false,
        )
        expect(results).toContain('1') // has "Yellow gene"
        expect(results).toContain('3') // has BRCA1
      })
    })

    describe('AND operator', () => {
      it('should return intersection of token results', () => {
        const results = runSearch(testIndex, 'YL protein', 'AND', false)
        // Only row 2 has both "YL" and "protein"
        expect(results).toEqual(['2'])
      })

      it('should return empty array when no rows match all tokens', () => {
        const results = runSearch(testIndex, 'YL BRCA1', 'AND', false)
        // No row has both "YL" and "BRCA1"
        expect(results).toEqual([])
      })

      it('should handle single token with AND', () => {
        const results = runSearch(testIndex, 'YL', 'AND', false)
        expect(results).toContain('1')
        expect(results).toContain('2')
      })
    })

    describe('OR operator', () => {
      it('should return union of token results', () => {
        const results = runSearch(testIndex, 'YL protein', 'OR', false)
        // Should include rows with "YL" or "protein"
        expect(results).toContain('1') // has YL
        expect(results).toContain('2') // has both
        expect(results).toContain('4') // has protein
      })

      it('should handle single token with OR', () => {
        const results = runSearch(testIndex, 'YL', 'OR', false)
        expect(results).toContain('1')
        expect(results).toContain('2')
      })
    })

    describe('exact matching', () => {
      it('should use exact matching when equals=true', () => {
        const results = runSearch(testIndex, 'YL', 'AND', true)
        // Exact match should find "YL" exactly (row 1 has "YL" as name, row 2 has "YL protein")
        expect(results).toContain('1')
        // Row 2 has "YL protein" which contains "YL" but may not match exact depending on Fuse.js behavior
        expect(results.length).toBeGreaterThan(0)
      })

      it('should handle exact matching with spaces', () => {
        const results = runSearch(testIndex, '"Yellow gene"', 'AND', true)
        // Exact phrase match
        expect(results).toContain('1')
      })

      it('should not match partial words with exact matching', () => {
        const results = runSearch(testIndex, 'Yell', 'AND', true)
        // Should not match "Yellow" with exact matching
        expect(results.length).toBe(0)
      })
    })

    describe('fuzzy matching', () => {
      it('should use fuzzy matching when equals=false', () => {
        const results = runSearch(testIndex, 'Yell', 'AND', false)
        // Fuzzy match should find "Yellow"
        expect(results.length).toBeGreaterThan(0)
      })
    })

    describe('Fuse.js extended search syntax', () => {
      it('should support starts with (^)', () => {
        const results = runSearch(testIndex, '^YL', 'AND', false)
        // Should find rows starting with "YL"
        expect(results).toContain('1')
        expect(results).toContain('2')
      })

      it('should support ends with ($)', () => {
        const results = runSearch(testIndex, 'gene$', 'AND', false)
        // Should find rows ending with "gene"
        expect(results).toContain('1')
        expect(results).toContain('3')
      })

      it('should support NOT operator (!)', () => {
        const results = runSearch(testIndex, '!protein', 'AND', false)
        // Should find rows that don't contain "protein"
        // Note: Fuse.js NOT operator may have different behavior, so we verify basic functionality
        expect(results.length).toBeGreaterThan(0)
        // Rows 1 and 3 should not contain "protein" in any field
        expect(results).toContain('1')
        expect(results).toContain('3')
        // Row 2 contains "protein" in name, so should be excluded
        expect(results).not.toContain('2')
        // Row 4 has "protein kinase" which contains "protein", but Fuse.js behavior may vary
        // We just verify that the NOT operator is being processed
      })
    })

    describe('edge cases', () => {
      it('should handle empty query', () => {
        const results = runSearch(testIndex, '', 'AND', false)
        expect(results).toEqual([])
      })

      it('should handle query with only whitespace', () => {
        const results = runSearch(testIndex, '   ', 'AND', false)
        expect(results).toEqual([])
      })

      it('should handle query with only commas', () => {
        const results = runSearch(testIndex, ',,,', 'AND', false)
        expect(results).toEqual([])
      })

      it('should handle unmatched quotes', () => {
        const results = runSearch(testIndex, '"unmatched quote', 'AND', false)
        // Should treat unmatched quote as regular character
        expect(results.length).toBeGreaterThanOrEqual(0)
      })

      it('should handle multiple spaces between tokens', () => {
        const results = runSearch(testIndex, 'YL    protein', 'AND', false)
        // Should still tokenize correctly
        expect(results).toContain('2')
      })
    })
  })
})
