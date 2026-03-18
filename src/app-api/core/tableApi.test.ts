// src/app-api/core/tableApi.test.ts
// Plain Jest tests for tableApi core — no renderHook, no React context.

import { ApiErrorCode } from '../types/ApiResult'
import { tableApi } from './tableApi'

// ── Mock: TableStore ──────────────────────────────────────────────────────────

const mockCreateColumn = jest.fn()
const mockDeleteColumn = jest.fn()
const mockSetColumnName = jest.fn()
const mockSetValue = jest.fn()
const mockSetValues = jest.fn()
const mockEditRows = jest.fn()
const mockApplyValueToElements = jest.fn()

// Mutable tables map for tests
const mockTables: Record<string, any> = {}

jest.mock('../../data/hooks/stores/TableStore', () => ({
  useTableStore: {
    getState: jest.fn(() => ({
      tables: mockTables,
      createColumn: mockCreateColumn,
      deleteColumn: mockDeleteColumn,
      setColumnName: mockSetColumnName,
      setValue: mockSetValue,
      setValues: mockSetValues,
      editRows: mockEditRows,
      applyValueToElements: mockApplyValueToElements,
    })),
  },
}))

// ── Mock: NetworkStore (for edge source/target in getTable) ──────────────────

const mockNetworks = new Map<string, any>()

jest.mock('../../data/hooks/stores/NetworkStore', () => ({
  useNetworkStore: {
    getState: jest.fn(() => ({
      networks: mockNetworks,
    })),
  },
}))

// ── Test helpers ─────────────────────────────────────────────────────────────

function makeTableRecord(
  nodeRows?: Map<string, any>,
  edgeRows?: Map<string, any>,
  nodeColumns?: any[],
  edgeColumns?: any[],
) {
  return {
    nodeTable: {
      rows: nodeRows ?? new Map(),
      columns: nodeColumns ?? [],
    },
    edgeTable: {
      rows: edgeRows ?? new Map(),
      columns: edgeColumns ?? [],
    },
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  // Reset any custom mockImplementation set by prior tests
  mockCreateColumn.mockReset()
  mockDeleteColumn.mockReset()
  mockSetColumnName.mockReset()
  mockSetValue.mockReset()
  mockSetValues.mockReset()
  mockEditRows.mockReset()
  mockApplyValueToElements.mockReset()
  // Clear mock tables
  Object.keys(mockTables).forEach((k) => delete mockTables[k])
  mockNetworks.clear()
})

// --- getValue ----------------------------------------------------------------

describe('getValue', () => {
  it('returns the value when element exists', () => {
    const rows = new Map([['n1', { name: 'Alice', age: 30 }]])
    mockTables['net1'] = makeTableRecord(rows)

    const result = tableApi.getValue('net1', 'node', 'n1', 'name')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.value).toBe('Alice')
    }
  })

  it('returns NetworkNotFound when network does not exist', () => {
    const result = tableApi.getValue('missing', 'node', 'n1', 'name')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
    }
  })

  it('returns NodeNotFound when node row does not exist', () => {
    mockTables['net1'] = makeTableRecord(new Map())

    const result = tableApi.getValue('net1', 'node', 'missing_node', 'name')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NodeNotFound)
    }
  })

  it('returns EdgeNotFound when edge row does not exist', () => {
    const edgeRows = new Map<string, any>()
    mockTables['net1'] = makeTableRecord(new Map(), edgeRows)

    const result = tableApi.getValue('net1', 'edge', 'missing_edge', 'name')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.EdgeNotFound)
    }
  })
})

// --- getRow ------------------------------------------------------------------

describe('getRow', () => {
  it('returns the full row when element exists', () => {
    const rows = new Map([['n1', { name: 'Alice', age: 30 }]])
    mockTables['net1'] = makeTableRecord(rows)

    const result = tableApi.getRow('net1', 'node', 'n1')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.row).toEqual({ name: 'Alice', age: 30 })
    }
  })

  it('returns NetworkNotFound when network does not exist', () => {
    const result = tableApi.getRow('missing', 'node', 'n1')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
    }
  })

  it('returns NodeNotFound when node does not exist', () => {
    mockTables['net1'] = makeTableRecord(new Map())

    const result = tableApi.getRow('net1', 'node', 'n_missing')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NodeNotFound)
    }
  })
})

// --- createColumn ------------------------------------------------------------

describe('createColumn', () => {
  it('calls createColumn and returns ok() when network exists', () => {
    mockTables['net1'] = makeTableRecord()

    const result = tableApi.createColumn('net1', 'node', 'score', 'double', 0)

    expect(result.success).toBe(true)
    expect(mockCreateColumn).toHaveBeenCalledWith(
      'net1',
      'node',
      'score',
      'double',
      0,
    )
  })

  it('returns NetworkNotFound when network does not exist', () => {
    const result = tableApi.createColumn('missing', 'node', 'score', 'double', 0)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
    }
    expect(mockCreateColumn).not.toHaveBeenCalled()
  })

  it('returns OperationFailed when store throws', () => {
    mockTables['net1'] = makeTableRecord()
    mockCreateColumn.mockImplementation(() => {
      throw new Error('store error')
    })

    const result = tableApi.createColumn('net1', 'node', 'score', 'double', 0)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.OperationFailed)
    }
  })
})

// --- deleteColumn ------------------------------------------------------------

describe('deleteColumn', () => {
  it('calls deleteColumn and returns ok() when network exists', () => {
    mockTables['net1'] = makeTableRecord()

    const result = tableApi.deleteColumn('net1', 'node', 'score')

    expect(result.success).toBe(true)
    expect(mockDeleteColumn).toHaveBeenCalledWith('net1', 'node', 'score')
  })

  it('returns NetworkNotFound when network does not exist', () => {
    const result = tableApi.deleteColumn('missing', 'node', 'score')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
    }
  })
})

// --- setColumnName -----------------------------------------------------------

describe('setColumnName', () => {
  it('calls setColumnName and returns ok() when network exists', () => {
    mockTables['net1'] = makeTableRecord()

    const result = tableApi.setColumnName('net1', 'node', 'oldName', 'newName')

    expect(result.success).toBe(true)
    expect(mockSetColumnName).toHaveBeenCalledWith(
      'net1',
      'node',
      'oldName',
      'newName',
    )
  })

  it('returns NetworkNotFound when network does not exist', () => {
    const result = tableApi.setColumnName('missing', 'node', 'a', 'b')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
    }
  })
})

// --- setValue ----------------------------------------------------------------

describe('setValue', () => {
  it('calls setValue and returns ok() when network exists', () => {
    mockTables['net1'] = makeTableRecord()

    const result = tableApi.setValue('net1', 'node', 'n1', 'name', 'Bob')

    expect(result.success).toBe(true)
    expect(mockSetValue).toHaveBeenCalledWith('net1', 'node', 'n1', 'name', 'Bob')
  })

  it('returns NetworkNotFound when network does not exist', () => {
    const result = tableApi.setValue('missing', 'node', 'n1', 'name', 'Bob')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
    }
  })
})

// --- setValues ---------------------------------------------------------------

describe('setValues', () => {
  it('converts app API CellEdit (id) to store CellEdit (row)', () => {
    mockTables['net1'] = makeTableRecord()

    const cellEdits = [
      { id: 'n1', column: 'name', value: 'Alice' },
      { id: 'n2', column: 'name', value: 'Bob' },
    ]

    const result = tableApi.setValues('net1', 'node', cellEdits)

    expect(result.success).toBe(true)
    expect(mockSetValues).toHaveBeenCalledWith('net1', 'node', [
      { row: 'n1', column: 'name', value: 'Alice' },
      { row: 'n2', column: 'name', value: 'Bob' },
    ])
  })

  it('returns NetworkNotFound when network does not exist', () => {
    const result = tableApi.setValues('missing', 'node', [])

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
    }
  })
})

// --- editRows ----------------------------------------------------------------

describe('editRows', () => {
  it('converts Record to Map and calls store', () => {
    mockTables['net1'] = makeTableRecord()

    const rows = {
      n1: { name: 'Alice', age: 30 },
      n2: { name: 'Bob', age: 25 },
    }

    const result = tableApi.editRows('net1', 'node', rows)

    expect(result.success).toBe(true)
    expect(mockEditRows).toHaveBeenCalledWith(
      'net1',
      'node',
      new Map([
        ['n1', { name: 'Alice', age: 30 }],
        ['n2', { name: 'Bob', age: 25 }],
      ]),
    )
  })

  it('returns NetworkNotFound when network does not exist', () => {
    const result = tableApi.editRows('missing', 'node', {})

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
    }
  })
})

// --- applyValueToElements ----------------------------------------------------

describe('applyValueToElements', () => {
  it('calls applyValueToElements with elementIds', () => {
    mockTables['net1'] = makeTableRecord()

    const result = tableApi.applyValueToElements(
      'net1',
      'node',
      'score',
      100,
      ['n1', 'n2'],
    )

    expect(result.success).toBe(true)
    expect(mockApplyValueToElements).toHaveBeenCalledWith(
      'net1',
      'node',
      'score',
      100,
      ['n1', 'n2'],
    )
  })

  it('calls applyValueToElements without elementIds (apply to all)', () => {
    mockTables['net1'] = makeTableRecord()

    const result = tableApi.applyValueToElements('net1', 'node', 'score', 0)

    expect(result.success).toBe(true)
    expect(mockApplyValueToElements).toHaveBeenCalledWith(
      'net1',
      'node',
      'score',
      0,
      undefined,
    )
  })

  it('returns NetworkNotFound when network does not exist', () => {
    const result = tableApi.applyValueToElements(
      'missing',
      'node',
      'score',
      0,
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
    }
  })
})

// --- getTable ----------------------------------------------------------------

describe('getTable', () => {
  it('returns columns with types and all rows', () => {
    const nodeRows = new Map([
      ['n1', { name: 'Alice', score: 0.9 }],
      ['n2', { name: 'Bob', score: 0.5 }],
    ])
    const columns = [
      { name: 'name', type: 'string' },
      { name: 'score', type: 'double' },
    ]
    mockTables['net1'] = makeTableRecord(nodeRows, undefined, columns)

    const result = tableApi.getTable('net1', 'node')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.columns).toEqual([
        { name: 'name', type: 'string' },
        { name: 'score', type: 'double' },
      ])
      expect(result.data.rows).toHaveLength(2)
      expect(result.data.rows[0]).toEqual({ name: 'Alice', score: 0.9 })
    }
  })

  it('filters columns when options.columns is provided', () => {
    const nodeRows = new Map([
      ['n1', { name: 'Alice', score: 0.9, age: 30 }],
    ])
    const columns = [
      { name: 'name', type: 'string' },
      { name: 'score', type: 'double' },
      { name: 'age', type: 'integer' },
    ]
    mockTables['net1'] = makeTableRecord(nodeRows, undefined, columns)

    const result = tableApi.getTable('net1', 'node', { columns: ['name'] })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.columns).toEqual([{ name: 'name', type: 'string' }])
      expect(result.data.rows[0]).toEqual({ name: 'Alice' })
    }
  })

  it('includes source/target for edge tables', () => {
    const edgeRows = new Map([
      ['e1', { interaction: 'pp', weight: 0.8 }],
    ])
    const edgeColumns = [
      { name: 'interaction', type: 'string' },
      { name: 'weight', type: 'double' },
    ]
    mockTables['net1'] = makeTableRecord(undefined, edgeRows, [], edgeColumns)
    mockNetworks.set('net1', {
      edges: [{ id: 'e1', s: 'n1', t: 'n2' }],
    })

    const result = tableApi.getTable('net1', 'edge')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.columns[0]).toEqual({ name: 'source', type: 'string' })
      expect(result.data.columns[1]).toEqual({ name: 'target', type: 'string' })
      expect(result.data.rows[0].source).toBe('n1')
      expect(result.data.rows[0].target).toBe('n2')
      expect(result.data.rows[0].interaction).toBe('pp')
    }
  })

  it('returns NetworkNotFound for invalid network', () => {
    const result = tableApi.getTable('missing', 'node')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
    }
  })
})

// --- exportTableToTsv --------------------------------------------------------

describe('exportTableToTsv', () => {
  it('produces valid TSV with header and data rows', () => {
    const nodeRows = new Map([
      ['n1', { name: 'Alice', score: 0.9 }],
      ['n2', { name: 'Bob', score: 0.5 }],
    ])
    const columns = [
      { name: 'name', type: 'string' },
      { name: 'score', type: 'double' },
    ]
    mockTables['net1'] = makeTableRecord(nodeRows, undefined, columns)

    const result = tableApi.exportTableToTsv('net1', 'node')

    expect(result.success).toBe(true)
    if (result.success) {
      const lines = result.data.tsvText.split('\n')
      expect(lines[0]).toBe('name\tscore')
      expect(lines[1]).toBe('Alice\t0.9')
      expect(lines[2]).toBe('Bob\t0.5')
    }
  })

  it('includes type annotations when includeTypeHeader is true', () => {
    const nodeRows = new Map([['n1', { name: 'Alice' }]])
    const columns = [{ name: 'name', type: 'string' }]
    mockTables['net1'] = makeTableRecord(nodeRows, undefined, columns)

    const result = tableApi.exportTableToTsv('net1', 'node', {
      includeTypeHeader: true,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      const lines = result.data.tsvText.split('\n')
      expect(lines[0]).toBe('name:string')
    }
  })

  it('edge table TSV always includes source and target', () => {
    const edgeRows = new Map([['e1', { weight: 0.8 }]])
    const edgeColumns = [{ name: 'weight', type: 'double' }]
    mockTables['net1'] = makeTableRecord(undefined, edgeRows, [], edgeColumns)
    mockNetworks.set('net1', {
      edges: [{ id: 'e1', s: 'n1', t: 'n2' }],
    })

    const result = tableApi.exportTableToTsv('net1', 'edge')

    expect(result.success).toBe(true)
    if (result.success) {
      const lines = result.data.tsvText.split('\n')
      expect(lines[0]).toBe('source\ttarget\tweight')
      expect(lines[1]).toBe('n1\tn2\t0.8')
    }
  })

  it('returns NetworkNotFound for invalid network', () => {
    const result = tableApi.exportTableToTsv('missing', 'node')
    expect(result.success).toBe(false)
  })
})

// --- importTableFromTsv ------------------------------------------------------

describe('importTableFromTsv', () => {
  it('creates new columns and writes data', () => {
    const nodeRows = new Map([
      ['n1', { name: 'Alice' }],
      ['n2', { name: 'Bob' }],
    ])
    const columns = [{ name: 'name', type: 'string' }]
    mockTables['net1'] = makeTableRecord(nodeRows, undefined, columns)

    const tsv = 'id\tname\tscore\nn1\tAlice\t0.9\nn2\tBob\t0.5'
    const result = tableApi.importTableFromTsv('net1', 'node', tsv)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.rowCount).toBe(2)
      expect(result.data.newColumns).toContain('score')
    }
    expect(mockCreateColumn).toHaveBeenCalledWith(
      'net1',
      'node',
      'score',
      expect.any(String),
      '',
    )
    expect(mockEditRows).toHaveBeenCalled()
  })

  it('preserves column types from typed header', () => {
    const nodeRows = new Map([['n1', { name: 'Alice' }]])
    const columns = [{ name: 'name', type: 'string' }]
    mockTables['net1'] = makeTableRecord(nodeRows, undefined, columns)

    const tsv = 'id\tname:string\tscore:double\nn1\tAlice\t0.9'
    const result = tableApi.importTableFromTsv('net1', 'node', tsv)

    expect(result.success).toBe(true)
    expect(mockCreateColumn).toHaveBeenCalledWith(
      'net1',
      'node',
      'score',
      'double',
      '',
    )
  })

  it('matches rows by custom keyColumn', () => {
    const nodeRows = new Map([
      ['n1', { gene: 'TP53' }],
      ['n2', { gene: 'BRCA1' }],
    ])
    const columns = [{ name: 'gene', type: 'string' }]
    mockTables['net1'] = makeTableRecord(nodeRows, undefined, columns)

    const tsv = 'gene\tcluster\nTP53\t0\nBRCA1\t1'
    const result = tableApi.importTableFromTsv('net1', 'node', tsv, {
      keyColumn: 'gene',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.rowCount).toBe(2)
    }
  })

  it('returns InvalidInput when key column not in header', () => {
    mockTables['net1'] = makeTableRecord()

    const tsv = 'name\tscore\nAlice\t0.9'
    const result = tableApi.importTableFromTsv('net1', 'node', tsv)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.InvalidInput)
    }
  })

  it('returns InvalidInput for TSV with only header', () => {
    mockTables['net1'] = makeTableRecord()

    const result = tableApi.importTableFromTsv('net1', 'node', 'id\tname')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.InvalidInput)
    }
  })

  it('returns NetworkNotFound for invalid network', () => {
    const result = tableApi.importTableFromTsv('missing', 'node', 'id\tname\nn1\tAlice')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
    }
  })
})

// --- Round-trip: exportTableToTsv → importTableFromTsv -----------------------

describe('TSV round-trip', () => {
  it('export → import preserves data', () => {
    const nodeRows = new Map([
      ['n1', { name: 'Alice', score: 42 }],
      ['n2', { name: 'Bob', score: 18 }],
    ])
    const columns = [
      { name: 'name', type: 'string' },
      { name: 'score', type: 'long' },
    ]
    mockTables['net1'] = makeTableRecord(nodeRows, undefined, columns)

    // Export
    const exportResult = tableApi.exportTableToTsv('net1', 'node', {
      includeTypeHeader: true,
    })
    expect(exportResult.success).toBe(true)
    if (!exportResult.success) return

    // Prepare for re-import (add id column for matching)
    const lines = exportResult.data.tsvText.split('\n')
    const withId = [
      'id\t' + lines[0],
      ...lines.slice(1).map((line, i) => `n${i + 1}\t${line}`),
    ].join('\n')

    // Import into same network
    const importResult = tableApi.importTableFromTsv('net1', 'node', withId)
    expect(importResult.success).toBe(true)
    if (importResult.success) {
      expect(importResult.data.rowCount).toBe(2)
    }
    expect(mockEditRows).toHaveBeenCalled()
  })
})
