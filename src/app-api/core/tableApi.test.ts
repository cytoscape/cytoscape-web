import { beforeEach, describe, expect, it, vi } from 'vitest'

// src/app-api/core/tableApi.test.ts
// Plain Jest tests for tableApi core — no renderHook, no React context.
import { ApiErrorCode } from '../types/ApiResult'
import { tableApi } from './tableApi'

// ── Mock: TableStore ──────────────────────────────────────────────────────────

const mockCreateColumn = vi.fn()
const mockDeleteColumn = vi.fn()
const mockSetColumnName = vi.fn()
const mockSetValue = vi.fn()
const mockSetValues = vi.fn()
const mockEditRows = vi.fn()
const mockApplyValueToElements = vi.fn()

// Mutable tables map for tests
const mockTables: Record<string, any> = {}

vi.mock('../../data/hooks/stores/TableStore', () => ({
  useTableStore: {
    getState: vi.fn(() => ({
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

vi.mock('../../data/hooks/stores/NetworkStore', () => ({
  useNetworkStore: {
    getState: vi.fn(() => ({
      networks: mockNetworks,
    })),
  },
}))

// ── Mock: VisualStyleStore (for column rename/delete mapping cascade) ────────

const mockSetMapping = vi.fn()
const mockVisualStyles: Record<string, any> = {}

vi.mock('../../data/hooks/stores/VisualStyleStore', () => ({
  useVisualStyleStore: {
    getState: vi.fn(() => ({
      visualStyles: mockVisualStyles,
      setMapping: mockSetMapping,
    })),
  },
}))

// ── Mock: UiStateStore (for tableDisplayConfiguration cascade) ───────────────

let mockUiStoreState: any = { ui: { visualStyleOptions: {} } }

vi.mock('../../data/hooks/stores/UiStateStore', () => ({
  useUiStateStore: {
    getState: vi.fn(() => mockUiStoreState),
    setState: vi.fn((updater: (state: any) => any) => {
      mockUiStoreState = updater(mockUiStoreState) ?? mockUiStoreState
    }),
  },
}))

/** Build a UiState with a tableDisplayConfiguration for one network */
function makeUiStateWithColumns(
  networkId: string,
  nodeColumns: string[],
  edgeColumns: string[] = [],
): any {
  const toConfig = (names: string[]) => ({
    columnConfiguration: names.map((attributeName) => ({
      attributeName,
      visible: true,
      columnWidth: undefined,
    })),
  })
  return {
    ui: {
      visualStyleOptions: {
        [networkId]: {
          visualEditorProperties: {
            tableDisplayConfiguration: {
              nodeTable: toConfig(nodeColumns),
              edgeTable: toConfig(edgeColumns),
            },
          },
        },
      },
    },
  }
}

/** Read column names back out of the mock display config */
function displayConfigColumns(
  networkId: string,
  tableType: 'nodeTable' | 'edgeTable',
): string[] {
  return (
    mockUiStoreState.ui.visualStyleOptions[networkId]?.visualEditorProperties
      ?.tableDisplayConfiguration?.[tableType]?.columnConfiguration ?? []
  ).map((c: { attributeName: string }) => c.attributeName)
}

const flushTimers = async (): Promise<void> =>
  await new Promise((resolve) => setTimeout(resolve, 0))

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

/** Register net1 in the NetworkStore mock with the given element IDs */
function registerNet1(nodes: string[], edges: string[] = []): void {
  mockNetworks.set('net1', {
    id: 'net1',
    nodes: nodes.map((id) => ({ id })),
    edges: edges.map((id) => ({ id, s: nodes[0], t: nodes[0] })),
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
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
  mockSetMapping.mockReset()
  Object.keys(mockVisualStyles).forEach((k) => delete mockVisualStyles[k])
  mockUiStoreState = { ui: { visualStyleOptions: {} } }
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

  it('rejects the forbidden column name "id" for nodes (CX2 FK1)', () => {
    mockTables['net1'] = makeTableRecord()

    const result = tableApi.createColumn('net1', 'node', 'id', 'string', '')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.InvalidInput)
      expect(result.error.cx2Code).toBe('FK1')
    }
    expect(mockCreateColumn).not.toHaveBeenCalled()
  })

  it('rejects the forbidden column name "id" for edges (CX2 FK2)', () => {
    mockTables['net1'] = makeTableRecord()

    const result = tableApi.createColumn('net1', 'edge', 'id', 'string', '')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.InvalidInput)
      expect(result.error.cx2Code).toBe('FK2')
    }
  })

  it('rejects reserved edge structural keys "s" and "t" (CX2 A8)', () => {
    mockTables['net1'] = makeTableRecord()

    for (const name of ['s', 't']) {
      const result = tableApi.createColumn('net1', 'edge', name, 'string', '')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.cx2Code).toBe('A8')
      }
    }
    expect(mockCreateColumn).not.toHaveBeenCalled()
  })

  it('allows "s" and "t" as node column names', async () => {
    mockTables['net1'] = makeTableRecord()

    const result = tableApi.createColumn('net1', 'node', 's', 'string', '')

    expect(result.success).toBe(true)
    // Drain the deferred display-config sync so it cannot leak into
    // a later test's mockUiStoreState
    await flushTimers()
  })

  it('rejects prototype-pollution column names', () => {
    mockTables['net1'] = makeTableRecord()

    const result = tableApi.createColumn(
      'net1',
      'node',
      '__proto__',
      'string',
      '',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.InvalidInput)
    }
  })

  it('rejects empty column names', () => {
    mockTables['net1'] = makeTableRecord()

    const result = tableApi.createColumn('net1', 'node', '  ', 'string', '')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.InvalidInput)
    }
  })

  it('rejects a column name that already exists (CX2 AC6)', () => {
    mockTables['net1'] = makeTableRecord(undefined, undefined, [
      { name: 'score', type: 'double' },
    ])

    const result = tableApi.createColumn('net1', 'node', 'score', 'double', 0)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.InvalidInput)
      expect(result.error.cx2Code).toBe('AC6')
    }
    expect(mockCreateColumn).not.toHaveBeenCalled()
  })

  it('rejects a null default value (CX2 A6)', () => {
    mockTables['net1'] = makeTableRecord()

    const result = tableApi.createColumn(
      'net1',
      'node',
      'score',
      'double',
      null as any,
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.InvalidInput)
      expect(result.error.cx2Code).toBe('A6')
    }
    expect(mockCreateColumn).not.toHaveBeenCalled()
  })

  it('rejects an undefined default value (CX2 A6)', () => {
    mockTables['net1'] = makeTableRecord()

    const result = tableApi.createColumn(
      'net1',
      'node',
      'score',
      'double',
      undefined as any,
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.cx2Code).toBe('A6')
    }
  })

  it('allows falsy but valid defaults (0, false, empty string)', async () => {
    mockTables['net1'] = makeTableRecord()

    expect(
      tableApi.createColumn('net1', 'node', 'count', 'integer', 0).success,
    ).toBe(true)
    expect(
      tableApi.createColumn('net1', 'node', 'flag', 'boolean', false).success,
    ).toBe(true)
    expect(
      tableApi.createColumn('net1', 'node', 'label', 'string', '').success,
    ).toBe(true)
    // Drain deferred display-config syncs so they cannot leak into
    // a later test's mockUiStoreState
    await flushTimers()
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

  it('deletes visual style mappings that reference the column', () => {
    mockTables['net1'] = makeTableRecord()
    mockVisualStyles['net1'] = {
      nodeFillColor: {
        group: 'node',
        mapping: { type: 'DISCRETE', attribute: 'score' },
      },
      nodeShape: {
        group: 'node',
        mapping: { type: 'PASSTHROUGH', attribute: 'other' },
      },
    }

    tableApi.deleteColumn('net1', 'node', 'score')

    expect(mockSetMapping).toHaveBeenCalledWith('net1', 'nodeFillColor', undefined)
    expect(mockSetMapping).toHaveBeenCalledTimes(1)
  })

  it('does not touch mappings of the other element group', () => {
    mockTables['net1'] = makeTableRecord()
    mockVisualStyles['net1'] = {
      edgeWidth: {
        group: 'edge',
        mapping: { type: 'CONTINUOUS', attribute: 'score' },
      },
    }

    tableApi.deleteColumn('net1', 'node', 'score')

    expect(mockSetMapping).not.toHaveBeenCalled()
  })

  it('removes the column from the tableDisplayConfiguration', async () => {
    mockTables['net1'] = makeTableRecord()
    mockUiStoreState = makeUiStateWithColumns('net1', ['name', 'score'], ['weight'])

    tableApi.deleteColumn('net1', 'node', 'score')
    await flushTimers()

    expect(displayConfigColumns('net1', 'nodeTable')).toEqual(['name'])
    expect(displayConfigColumns('net1', 'edgeTable')).toEqual(['weight'])
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

  it('retargets visual style mappings to the new column name', () => {
    mockTables['net1'] = makeTableRecord()
    mockVisualStyles['net1'] = {
      nodeFillColor: {
        group: 'node',
        mapping: { type: 'DISCRETE', attribute: 'oldName' },
      },
      edgeWidth: {
        group: 'edge',
        mapping: { type: 'CONTINUOUS', attribute: 'oldName' },
      },
    }

    tableApi.setColumnName('net1', 'node', 'oldName', 'newName')

    expect(mockSetMapping).toHaveBeenCalledWith('net1', 'nodeFillColor', {
      type: 'DISCRETE',
      attribute: 'newName',
    })
    expect(mockSetMapping).toHaveBeenCalledTimes(1)
  })

  it('rejects renaming a column to a name that already exists (CX2 AC6)', () => {
    mockTables['net1'] = makeTableRecord(undefined, undefined, [
      { name: 'score', type: 'double' },
      { name: 'weight', type: 'double' },
    ])

    const result = tableApi.setColumnName('net1', 'node', 'score', 'weight')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.InvalidInput)
      expect(result.error.cx2Code).toBe('AC6')
    }
    expect(mockSetColumnName).not.toHaveBeenCalled()
  })

  it('treats a self-rename as a no-op rather than a duplicate', () => {
    mockTables['net1'] = makeTableRecord(undefined, undefined, [
      { name: 'score', type: 'double' },
    ])

    const result = tableApi.setColumnName('net1', 'node', 'score', 'score')

    expect(result.success).toBe(true)
  })

  it('rejects renaming a column to the forbidden name "id" (CX2 FK1)', () => {
    mockTables['net1'] = makeTableRecord()

    const result = tableApi.setColumnName('net1', 'node', 'oldName', 'id')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.InvalidInput)
      expect(result.error.cx2Code).toBe('FK1')
    }
    expect(mockSetColumnName).not.toHaveBeenCalled()
  })

  it('renames the column in the tableDisplayConfiguration', async () => {
    mockTables['net1'] = makeTableRecord()
    mockUiStoreState = makeUiStateWithColumns('net1', ['name', 'oldName'])

    tableApi.setColumnName('net1', 'node', 'oldName', 'newName')
    await flushTimers()

    expect(displayConfigColumns('net1', 'nodeTable')).toEqual([
      'name',
      'newName',
    ])
  })
})

// --- setValue ----------------------------------------------------------------

describe('setValue', () => {
  it('calls setValue and returns ok() when network exists', () => {
    mockTables['net1'] = makeTableRecord()
    registerNet1(['n1'])

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

  it('rejects writes to nodes that do not exist (CX2 GL1)', () => {
    mockTables['net1'] = makeTableRecord()
    registerNet1(['n1'])

    const result = tableApi.setValue('net1', 'node', 'ghost', 'name', 'Bob')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NodeNotFound)
      expect(result.error.cx2Code).toBe('GL1')
    }
    expect(mockSetValue).not.toHaveBeenCalled()
  })

  it('rejects edge-table writes keyed by a node ID (CX2 GL2)', () => {
    mockTables['net1'] = makeTableRecord()
    registerNet1(['n1'], ['e0'])

    const result = tableApi.setValue('net1', 'edge', 'n1', 'weight', 1)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.EdgeNotFound)
      expect(result.error.cx2Code).toBe('GL2')
    }
  })

  it('rejects a value that does not match the declared column type (CX2 A1)', () => {
    mockTables['net1'] = makeTableRecord(undefined, undefined, [
      { name: 'age', type: 'long' },
    ])
    registerNet1(['n1'])

    const result = tableApi.setValue('net1', 'node', 'n1', 'age', 'not-a-number')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.InvalidInput)
      expect(result.error.cx2Code).toBe('A1')
      expect(result.error.message).toContain('age')
    }
    expect(mockSetValue).not.toHaveBeenCalled()
  })

  it('rejects a non-integer number for an integer column (CX2 A1)', () => {
    mockTables['net1'] = makeTableRecord(undefined, undefined, [
      { name: 'count', type: 'integer' },
    ])
    registerNet1(['n1'])

    const result = tableApi.setValue('net1', 'node', 'n1', 'count', 1.5)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.cx2Code).toBe('A1')
    }
  })

  it('rejects a list value with mismatched element types (CX2 A1)', () => {
    mockTables['net1'] = makeTableRecord(undefined, undefined, [
      { name: 'tags', type: 'list_of_string' },
    ])
    registerNet1(['n1'])

    const result = tableApi.setValue('net1', 'node', 'n1', 'tags', [
      'a',
      5,
    ] as any)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.cx2Code).toBe('A1')
    }
  })

  it('accepts matching values including lists', () => {
    mockTables['net1'] = makeTableRecord(undefined, undefined, [
      { name: 'age', type: 'long' },
      { name: 'tags', type: 'list_of_string' },
    ])
    registerNet1(['n1'])

    expect(tableApi.setValue('net1', 'node', 'n1', 'age', 42).success).toBe(
      true,
    )
    expect(
      tableApi.setValue('net1', 'node', 'n1', 'tags', ['a', 'b']).success,
    ).toBe(true)
  })

  it('passes through writes to undeclared columns unchanged', () => {
    mockTables['net1'] = makeTableRecord(undefined, undefined, [
      { name: 'age', type: 'long' },
    ])
    registerNet1(['n1'])

    const result = tableApi.setValue('net1', 'node', 'n1', 'undeclared', 'x')

    expect(result.success).toBe(true)
    expect(mockSetValue).toHaveBeenCalled()
  })
})

// --- setValues ---------------------------------------------------------------

describe('setValues', () => {
  it('converts app API CellEdit (id) to store CellEdit (row)', () => {
    mockTables['net1'] = makeTableRecord()
    registerNet1(['n1', 'n2'])

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

  it('rejects the batch when any edit targets a missing element (CX2 GL1)', () => {
    mockTables['net1'] = makeTableRecord()
    registerNet1(['n1'])

    const result = tableApi.setValues('net1', 'node', [
      { id: 'n1', column: 'name', value: 'Alice' },
      { id: 'ghost', column: 'name', value: 'Boo' },
    ])

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NodeNotFound)
      expect(result.error.message).toContain('ghost')
    }
    expect(mockSetValues).not.toHaveBeenCalled()
  })

  it('rejects the batch when any value mismatches its column type (CX2 A1)', () => {
    mockTables['net1'] = makeTableRecord(undefined, undefined, [
      { name: 'age', type: 'long' },
    ])
    registerNet1(['n1', 'n2'])

    const result = tableApi.setValues('net1', 'node', [
      { id: 'n1', column: 'age', value: 30 },
      { id: 'n2', column: 'age', value: 'thirty' },
    ])

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.cx2Code).toBe('A1')
    }
    expect(mockSetValues).not.toHaveBeenCalled()
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
    registerNet1(['n1', 'n2'])

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

  it('rejects rows keyed by missing elements (CX2 GL1)', () => {
    mockTables['net1'] = makeTableRecord()
    registerNet1(['n1'])

    const result = tableApi.editRows('net1', 'node', {
      ghost: { name: 'Boo' },
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NodeNotFound)
    }
    expect(mockEditRows).not.toHaveBeenCalled()
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
    registerNet1(['n1', 'n2'])

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

  it('rejects elementIds that do not exist (CX2 GL1)', () => {
    mockTables['net1'] = makeTableRecord()
    registerNet1(['n1'])

    const result = tableApi.applyValueToElements('net1', 'node', 'score', 1, [
      'n1',
      'ghost',
    ])

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NodeNotFound)
    }
    expect(mockApplyValueToElements).not.toHaveBeenCalled()
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

// --- getColumns ----------------------------------------------------------------

describe('getColumns', () => {
  it('returns column definitions without loading rows', () => {
    mockTables['net1'] = makeTableRecord(undefined, undefined, [
      { name: 'name', type: 'string' },
      { name: 'score', type: 'double' },
    ])

    const result = tableApi.getColumns('net1', 'node')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.columns).toEqual([
        { name: 'name', type: 'string' },
        { name: 'score', type: 'double' },
      ])
    }
  })

  it('prepends source/target for edge tables (matching getTable)', () => {
    mockTables['net1'] = makeTableRecord(undefined, undefined, [], [
      { name: 'weight', type: 'double' },
    ])

    const result = tableApi.getColumns('net1', 'edge')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.columns).toEqual([
        { name: 'source', type: 'string' },
        { name: 'target', type: 'string' },
        { name: 'weight', type: 'double' },
      ])
    }
  })

  it('returns NetworkNotFound when network does not exist', () => {
    const result = tableApi.getColumns('missing', 'node')

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
    registerNet1(['n1', 'n2'])

    const tsv = 'id\tname\tscore\nn1\tAlice\t0.9\nn2\tBob\t0.5'
    const result = tableApi.importTableFromTsv('net1', 'node', tsv)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.rowCount).toBe(2)
      expect(result.data.newColumns).toContain('score')
      expect(result.data.skippedRows).toEqual([])
    }
    expect(mockCreateColumn).toHaveBeenCalledWith(
      'net1',
      'node',
      'score',
      expect.any(String),
      '',
    )
    expect(mockSetValues).toHaveBeenCalled()
  })

  it('preserves column types from typed header', () => {
    const nodeRows = new Map([['n1', { name: 'Alice' }]])
    const columns = [{ name: 'name', type: 'string' }]
    mockTables['net1'] = makeTableRecord(nodeRows, undefined, columns)
    registerNet1(['n1'])

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

  it('skips rows whose IDs are not in the network and reports them', () => {
    const nodeRows = new Map([['n1', { name: 'Alice' }]])
    const columns = [{ name: 'name', type: 'string' }]
    mockTables['net1'] = makeTableRecord(nodeRows, undefined, columns)
    registerNet1(['n1'])

    const tsv = 'id\tname\nn1\tAlice\nghost\tBoo'
    const result = tableApi.importTableFromTsv('net1', 'node', tsv)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.rowCount).toBe(1)
      expect(result.data.skippedRows).toEqual(['ghost'])
    }
    // No cell edit may reference the unknown row
    const edits = mockSetValues.mock.calls[0][2]
    expect(edits.every((e: { row: string }) => e.row === 'n1')).toBe(true)
  })

  it('matches rows by custom keyColumn', () => {
    const nodeRows = new Map([
      ['n1', { gene: 'TP53' }],
      ['n2', { gene: 'BRCA1' }],
    ])
    const columns = [{ name: 'gene', type: 'string' }]
    mockTables['net1'] = makeTableRecord(nodeRows, undefined, columns)
    registerNet1(['n1', 'n2'])

    const tsv = 'gene\tcluster\nTP53\t0\nBRCA1\t1'
    const result = tableApi.importTableFromTsv('net1', 'node', tsv, {
      keyColumn: 'gene',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.rowCount).toBe(2)
    }
  })

  it('resolves custom key values to element IDs (no orphaned rows)', () => {
    const nodeRows = new Map([
      ['n1', { gene: 'TP53' }],
      ['n2', { gene: 'BRCA1' }],
    ])
    const columns = [{ name: 'gene', type: 'string' }]
    mockTables['net1'] = makeTableRecord(nodeRows, undefined, columns)
    registerNet1(['n1', 'n2'])

    const tsv = 'gene\tcluster\nTP53\t7\nUNKNOWN_GENE\t9'
    const result = tableApi.importTableFromTsv('net1', 'node', tsv, {
      keyColumn: 'gene',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.rowCount).toBe(1)
      expect(result.data.skippedRows).toEqual(['UNKNOWN_GENE'])
    }
    // Cell edits must be keyed by the element ID, not the gene name
    const edits = mockSetValues.mock.calls[0][2]
    expect(edits).toEqual([{ row: 'n1', column: 'cluster', value: 7 }])
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
    registerNet1(['n1', 'n2'])

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
    expect(mockSetValues).toHaveBeenCalled()
  })
})
