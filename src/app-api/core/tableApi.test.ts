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

// ── Test helpers ─────────────────────────────────────────────────────────────

function makeTableRecord(nodeRows?: Map<string, any>, edgeRows?: Map<string, any>) {
  return {
    nodeTable: {
      rows: nodeRows ?? new Map(),
      columns: [],
    },
    edgeTable: {
      rows: edgeRows ?? new Map(),
      columns: [],
    },
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  // Clear mock tables
  Object.keys(mockTables).forEach((k) => delete mockTables[k])
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
