import { beforeEach, describe, expect, it, vi } from 'vitest'

// src/app-api/core/tableApi.test.ts
// Plain Jest tests for tableApi core — no renderHook, no React context.
import { deleteUiStateFromDb, getUiStateFromDb } from '../../data/db'
import { flushPendingWrites } from '../../data/hooks/stores/persistenceScheduler'
import {
  DEFAULT_UI_STATE,
  useUiStateStore,
} from '../../data/hooks/stores/UiStateStore'
import { AppCodes, ElementCodes, TableCodes } from '../types/ApiResult'
import { tableApi } from './tableApi'

// ── Mock: WorkspaceStore (markNetworkModified) ───────────────────────────────

const mockSetNetworkModified = vi.fn()

vi.mock('../../data/hooks/stores/WorkspaceStore', () => ({
  useWorkspaceStore: {
    getState: vi.fn(() => ({
      workspace: { currentNetworkId: 'net1', networkModified: {} },
      setNetworkModified: mockSetNetworkModified,
    })),
  },
}))

// ── Mock: UndoStore (corePostEdit) ───────────────────────────────────────────

const mockSetUndoStack = vi.fn()
const mockSetRedoStack = vi.fn()

vi.mock('../../data/hooks/stores/UndoStore', () => ({
  useUndoStore: {
    getState: vi.fn(() => ({
      undoRedoStacks: {},
      setUndoStack: mockSetUndoStack,
      setRedoStack: mockSetRedoStack,
    })),
  },
}))

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

// ── UiStateStore: the REAL store, backed by fake-indexeddb ───────────────────
//
// #685: the display-config cascade used to be asserted against a mocked
// UiStateStore, which recorded the in-memory mutation and nothing else — so a
// cascade that never reached IndexedDB looked correct. These tests drive the
// real store and read the persisted `uiState` row back.

/** Seed the store with a tableDisplayConfiguration for one network */
function seedUiStateWithColumns(
  networkId: string,
  nodeColumns: string[],
  edgeColumns: string[] = [],
): void {
  const toConfig = (names: string[]) => ({
    columnConfiguration: names.map((attributeName) => ({
      attributeName,
      visible: true,
      columnWidth: undefined,
    })),
  })
  useUiStateStore.setState({
    ui: {
      ...DEFAULT_UI_STATE,
      visualStyleOptions: {
        [networkId]: {
          visualEditorProperties: {
            nodeSizeLocked: false,
            arrowColorMatchesEdge: false,
            tableDisplayConfiguration: {
              nodeTable: toConfig(nodeColumns),
              edgeTable: toConfig(edgeColumns),
            },
          },
        },
      },
    },
  } as any)
}

const columnNamesOf = (ui: any, networkId: string, tableType: string) =>
  (
    ui?.visualStyleOptions?.[networkId]?.visualEditorProperties
      ?.tableDisplayConfiguration?.[tableType]?.columnConfiguration ?? []
  ).map((c: { attributeName: string }) => c.attributeName)

/** Column names in the in-memory display config */
function displayConfigColumns(
  networkId: string,
  tableType: 'nodeTable' | 'edgeTable',
): string[] {
  return columnNamesOf(useUiStateStore.getState().ui, networkId, tableType)
}

/**
 * Column names in the display config as it exists in IndexedDB.
 *
 * Flushes the write coalescer first — this is the assertion that fails when
 * a cascade mutates the store without persisting.
 */
async function persistedDisplayConfigColumns(
  networkId: string,
  tableType: 'nodeTable' | 'edgeTable',
): Promise<string[]> {
  await flushPendingWrites()
  return columnNamesOf(await getUiStateFromDb(), networkId, tableType)
}

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

beforeEach(async () => {
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
  useUiStateStore.setState({ ui: { ...DEFAULT_UI_STATE } } as any)
  await flushPendingWrites()
  await deleteUiStateFromDb()
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
      expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
    }
  })

  it('returns NodeNotFound when node row does not exist', () => {
    mockTables['net1'] = makeTableRecord(new Map())

    const result = tableApi.getValue('net1', 'node', 'missing_node', 'name')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ElementCodes.NODE_NOT_FOUND.code)
    }
  })

  it('returns EdgeNotFound when edge row does not exist', () => {
    const edgeRows = new Map<string, any>()
    mockTables['net1'] = makeTableRecord(new Map(), edgeRows)

    const result = tableApi.getValue('net1', 'edge', 'missing_edge', 'name')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ElementCodes.EDGE_NOT_FOUND.code)
    }
  })

  it('returns ColumnNotFound when column is neither declared nor present', () => {
    const rows = new Map([['n1', { name: 'Alice' }]])
    mockTables['net1'] = makeTableRecord(rows)

    const result = tableApi.getValue('net1', 'node', 'n1', 'missing_col')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.COLUMN_NOT_FOUND.code)
    }
  })

  it('returns undefined for a declared column with no value in the row', () => {
    const rows = new Map([['n1', {}]])
    mockTables['net1'] = makeTableRecord(rows, undefined, [
      { name: 'score', type: 'double' },
    ])

    const result = tableApi.getValue('net1', 'node', 'n1', 'score')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.value).toBeUndefined()
    }
  })

  it('resolves the source/target pseudo-columns for edge tables', () => {
    const edgeRows = new Map([['e1', { weight: 1 }]])
    mockTables['net1'] = makeTableRecord(new Map(), edgeRows)
    // Distinct endpoints (registerNet1 builds self-loops), so swapping
    // source and target in the implementation cannot pass unnoticed
    mockNetworks.set('net1', {
      id: 'net1',
      nodes: [{ id: 'n1' }, { id: 'n2' }],
      edges: [{ id: 'e1', s: 'n1', t: 'n2' }],
    })

    const source = tableApi.getValue('net1', 'edge', 'e1', 'source')
    const target = tableApi.getValue('net1', 'edge', 'e1', 'target')

    expect(source.success && source.data.value).toBe('n1')
    expect(target.success && target.data.value).toBe('n2')
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
      expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
    }
  })

  it('returns NodeNotFound when node does not exist', () => {
    mockTables['net1'] = makeTableRecord(new Map())

    const result = tableApi.getRow('net1', 'node', 'n_missing')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ElementCodes.NODE_NOT_FOUND.code)
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
    const result = tableApi.createColumn(
      'missing',
      'node',
      'score',
      'double',
      0,
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
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
      expect(result.error.code).toBe(AppCodes.OPERATION_FAILED.code)
    }
  })

  it('rejects the forbidden column name "id" for nodes (CX2 FK1)', () => {
    mockTables['net1'] = makeTableRecord()

    const result = tableApi.createColumn('net1', 'node', 'id', 'string', '')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(TableCodes.NODE_ID_COLUMN_FORBIDDEN.code)
    }
    expect(mockCreateColumn).not.toHaveBeenCalled()
  })

  it('rejects the forbidden column name "id" for edges (CX2 FK2)', () => {
    mockTables['net1'] = makeTableRecord()

    const result = tableApi.createColumn('net1', 'edge', 'id', 'string', '')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(TableCodes.EDGE_ID_COLUMN_FORBIDDEN.code)
    }
  })

  it('rejects reserved edge structural keys "s" and "t" (CX2 A8)', () => {
    mockTables['net1'] = makeTableRecord()

    for (const name of ['s', 't']) {
      const result = tableApi.createColumn('net1', 'edge', name, 'string', '')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(
          TableCodes.EDGE_STRUCTURAL_KEY_RESERVED.code,
        )
      }
    }
    expect(mockCreateColumn).not.toHaveBeenCalled()
  })

  it('allows "s" and "t" as node column names', async () => {
    mockTables['net1'] = makeTableRecord()

    const result = tableApi.createColumn('net1', 'node', 's', 'string', '')

    expect(result.success).toBe(true)
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
      expect(result.error.code).toBe(AppCodes.INVALID_INPUT.code)
    }
  })

  it('rejects empty column names', () => {
    mockTables['net1'] = makeTableRecord()

    const result = tableApi.createColumn('net1', 'node', '  ', 'string', '')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.INVALID_INPUT.code)
    }
  })

  it('rejects a column name that already exists (CX2 AC6)', () => {
    mockTables['net1'] = makeTableRecord(undefined, undefined, [
      { name: 'score', type: 'double' },
    ])

    const result = tableApi.createColumn('net1', 'node', 'score', 'double', 0)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(TableCodes.COLUMN_ALREADY_EXISTS.code)
    }
    expect(mockCreateColumn).not.toHaveBeenCalled()
  })

  it('rejects a default value that does not match the declared type (CX2 A1)', () => {
    mockTables['net1'] = makeTableRecord()

    const result = tableApi.createColumn(
      'net1',
      'node',
      'score',
      'double' as any,
      'hello',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(TableCodes.VALUE_TYPE_MISMATCH.code)
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
      expect(result.error.code).toBe(TableCodes.COLUMN_DEFAULT_NULL.code)
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
      expect(result.error.code).toBe(TableCodes.COLUMN_DEFAULT_NULL.code)
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
  })

  // #685 — the column reached cyTables but the display config it needs to be
  // rendered stayed in memory, so the Table Browser lost it on reload.
  describe('tableDisplayConfiguration (#685)', () => {
    it('adds the new column to the persisted display config', async () => {
      mockTables['net1'] = makeTableRecord()
      seedUiStateWithColumns('net1', ['name'], ['weight'])

      expect(
        tableApi.createColumn('net1', 'node', 'MCODE_Cluster', 'integer', 0)
          .success,
      ).toBe(true)

      expect(displayConfigColumns('net1', 'nodeTable')).toEqual([
        'MCODE_Cluster',
        'name',
      ])
      expect(await persistedDisplayConfigColumns('net1', 'nodeTable')).toEqual([
        'MCODE_Cluster',
        'name',
      ])
    })

    it('persists with no later UiStateStore setter call', async () => {
      // The exact condition that failed: nothing touches the store between
      // the app's write and the reload, so no unrelated setter flushes the
      // shared `ui` row on its behalf.
      mockTables['net1'] = makeTableRecord()
      seedUiStateWithColumns('net1', ['name'])

      tableApi.createColumn('net1', 'node', 'MCODE_Score', 'double', 0)

      await flushPendingWrites()
      const persisted = await getUiStateFromDb()
      expect(columnNamesOf(persisted, 'net1', 'nodeTable')).toEqual([
        'MCODE_Score',
        'name',
      ])
    })

    it('leaves the edge display config alone for a node column', async () => {
      mockTables['net1'] = makeTableRecord()
      seedUiStateWithColumns('net1', ['name'], ['weight'])

      tableApi.createColumn('net1', 'node', 'MCODE_Cluster', 'integer', 0)

      expect(await persistedDisplayConfigColumns('net1', 'edgeTable')).toEqual([
        'weight',
      ])
    })

    it('does nothing when the network has no display config', async () => {
      mockTables['net1'] = makeTableRecord()

      expect(
        tableApi.createColumn('net1', 'node', 'MCODE_Cluster', 'integer', 0)
          .success,
      ).toBe(true)
      expect(displayConfigColumns('net1', 'nodeTable')).toEqual([])
    })
  })
})

// --- deleteColumn ------------------------------------------------------------

describe('deleteColumn', () => {
  it('calls deleteColumn and returns ok() when network exists', () => {
    mockTables['net1'] = makeTableRecord(undefined, undefined, [
      { name: 'score', type: 'double' },
    ])

    const result = tableApi.deleteColumn('net1', 'node', 'score')

    expect(result.success).toBe(true)
    expect(mockDeleteColumn).toHaveBeenCalledWith('net1', 'node', 'score')
  })

  it('returns NetworkNotFound when network does not exist', () => {
    const result = tableApi.deleteColumn('missing', 'node', 'score')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
    }
  })

  it('returns ColumnNotFound when the column does not exist', () => {
    mockTables['net1'] = makeTableRecord()

    const result = tableApi.deleteColumn('net1', 'node', 'missing_col')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.COLUMN_NOT_FOUND.code)
    }
    expect(mockDeleteColumn).not.toHaveBeenCalled()
  })

  it('deletes visual style mappings that reference the column', () => {
    mockTables['net1'] = makeTableRecord(undefined, undefined, [
      { name: 'score', type: 'double' },
    ])
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

    expect(mockSetMapping).toHaveBeenCalledWith(
      'net1',
      'nodeFillColor',
      undefined,
    )
    expect(mockSetMapping).toHaveBeenCalledTimes(1)
  })

  it('does not touch mappings of the other element group', () => {
    mockTables['net1'] = makeTableRecord(undefined, undefined, [
      { name: 'score', type: 'double' },
    ])
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
    mockTables['net1'] = makeTableRecord(undefined, undefined, [
      { name: 'score', type: 'double' },
    ])
    seedUiStateWithColumns('net1', ['name', 'score'], ['weight'])

    tableApi.deleteColumn('net1', 'node', 'score')

    expect(displayConfigColumns('net1', 'nodeTable')).toEqual(['name'])
    expect(displayConfigColumns('net1', 'edgeTable')).toEqual(['weight'])
    // #685: the removal must survive a reload
    expect(await persistedDisplayConfigColumns('net1', 'nodeTable')).toEqual([
      'name',
    ])
  })
})

// --- renameColumn ------------------------------------------------------------

describe('renameColumn', () => {
  it('calls the store setColumnName and returns ok() when network exists', () => {
    mockTables['net1'] = makeTableRecord(undefined, undefined, [
      { name: 'oldName', type: 'string' },
    ])

    const result = tableApi.renameColumn('net1', 'node', 'oldName', 'newName')

    expect(result.success).toBe(true)
    expect(mockSetColumnName).toHaveBeenCalledWith(
      'net1',
      'node',
      'oldName',
      'newName',
    )
  })

  it('returns NetworkNotFound when network does not exist', () => {
    const result = tableApi.renameColumn('missing', 'node', 'a', 'b')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
    }
  })

  it('returns ColumnNotFound when the source column does not exist', () => {
    mockTables['net1'] = makeTableRecord()

    const result = tableApi.renameColumn('net1', 'node', 'missing_col', 'b')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.COLUMN_NOT_FOUND.code)
    }
    expect(mockSetColumnName).not.toHaveBeenCalled()
  })

  it('retargets visual style mappings to the new column name', () => {
    mockTables['net1'] = makeTableRecord(undefined, undefined, [
      { name: 'oldName', type: 'string' },
    ])
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

    tableApi.renameColumn('net1', 'node', 'oldName', 'newName')

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

    const result = tableApi.renameColumn('net1', 'node', 'score', 'weight')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(TableCodes.COLUMN_ALREADY_EXISTS.code)
    }
    expect(mockSetColumnName).not.toHaveBeenCalled()
  })

  it('treats a self-rename as a no-op rather than a duplicate', () => {
    mockTables['net1'] = makeTableRecord(undefined, undefined, [
      { name: 'score', type: 'double' },
    ])

    const result = tableApi.renameColumn('net1', 'node', 'score', 'score')

    expect(result.success).toBe(true)
  })

  it('rejects renaming a column to the forbidden name "id" (CX2 FK1)', () => {
    mockTables['net1'] = makeTableRecord()

    const result = tableApi.renameColumn('net1', 'node', 'oldName', 'id')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(TableCodes.NODE_ID_COLUMN_FORBIDDEN.code)
    }
    expect(mockSetColumnName).not.toHaveBeenCalled()
  })

  it('renames the column in the tableDisplayConfiguration', async () => {
    mockTables['net1'] = makeTableRecord(undefined, undefined, [
      { name: 'oldName', type: 'string' },
    ])
    seedUiStateWithColumns('net1', ['name', 'oldName'])

    tableApi.renameColumn('net1', 'node', 'oldName', 'newName')

    expect(displayConfigColumns('net1', 'nodeTable')).toEqual([
      'name',
      'newName',
    ])
    // #685: the rename must survive a reload
    expect(await persistedDisplayConfigColumns('net1', 'nodeTable')).toEqual([
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
    expect(mockSetValue).toHaveBeenCalledWith(
      'net1',
      'node',
      'n1',
      'name',
      'Bob',
    )
  })

  it('returns NetworkNotFound when network does not exist', () => {
    const result = tableApi.setValue('missing', 'node', 'n1', 'name', 'Bob')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
    }
  })

  it('rejects writes to nodes that do not exist (CX2 GL1)', () => {
    mockTables['net1'] = makeTableRecord()
    registerNet1(['n1'])

    const result = tableApi.setValue('net1', 'node', 'ghost', 'name', 'Bob')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ElementCodes.NODE_NOT_FOUND.code)
    }
    expect(mockSetValue).not.toHaveBeenCalled()
  })

  it('rejects edge-table writes keyed by a node ID (CX2 GL2)', () => {
    mockTables['net1'] = makeTableRecord()
    registerNet1(['n1'], ['e0'])

    const result = tableApi.setValue('net1', 'edge', 'n1', 'weight', 1)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ElementCodes.EDGE_NOT_FOUND.code)
    }
  })

  it('rejects a value that does not match the declared column type (CX2 A1)', () => {
    mockTables['net1'] = makeTableRecord(undefined, undefined, [
      { name: 'age', type: 'long' },
    ])
    registerNet1(['n1'])

    const result = tableApi.setValue(
      'net1',
      'node',
      'n1',
      'age',
      'not-a-number',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(TableCodes.VALUE_TYPE_MISMATCH.code)
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
      expect(result.error.code).toBe(TableCodes.VALUE_TYPE_MISMATCH.code)
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
      expect(result.error.code).toBe(TableCodes.VALUE_TYPE_MISMATCH.code)
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
      expect(result.error.code).toBe(ElementCodes.NODE_NOT_FOUND.code)
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
      expect(result.error.code).toBe(TableCodes.VALUE_TYPE_MISMATCH.code)
    }
    expect(mockSetValues).not.toHaveBeenCalled()
  })

  it('returns NetworkNotFound when network does not exist', () => {
    const result = tableApi.setValues('missing', 'node', [])

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
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
      expect(result.error.code).toBe(ElementCodes.NODE_NOT_FOUND.code)
    }
    expect(mockEditRows).not.toHaveBeenCalled()
  })

  it('returns NetworkNotFound when network does not exist', () => {
    const result = tableApi.editRows('missing', 'node', {})

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
    }
  })
})

// --- applyValueToElements ----------------------------------------------------

describe('applyValueToElements', () => {
  it('calls applyValueToElements with elementIds', () => {
    mockTables['net1'] = makeTableRecord()
    registerNet1(['n1', 'n2'])

    const result = tableApi.applyValueToElements('net1', 'node', 'score', 100, [
      'n1',
      'n2',
    ])

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
      expect(result.error.code).toBe(ElementCodes.NODE_NOT_FOUND.code)
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
    const result = tableApi.applyValueToElements('missing', 'node', 'score', 0)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
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
    mockTables['net1'] = makeTableRecord(
      undefined,
      undefined,
      [],
      [{ name: 'weight', type: 'double' }],
    )

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
      expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
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
      // id is prepended by default so rows map back to nodes
      expect(result.data.columns).toEqual([
        { name: 'id', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'score', type: 'double' },
      ])
      expect(result.data.rows).toHaveLength(2)
      expect(result.data.rows[0]).toEqual({
        id: 'n1',
        name: 'Alice',
        score: 0.9,
      })
    }
  })

  it('omits the id column when includeId is false', () => {
    const nodeRows = new Map([['n1', { name: 'Alice' }]])
    const columns = [{ name: 'name', type: 'string' }]
    mockTables['net1'] = makeTableRecord(nodeRows, undefined, columns)

    const result = tableApi.getTable('net1', 'node', { includeId: false })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.columns).toEqual([{ name: 'name', type: 'string' }])
      expect(result.data.rows[0]).toEqual({ name: 'Alice' })
    }
  })

  it('filters columns when options.columns is provided (id still included)', () => {
    const nodeRows = new Map([['n1', { name: 'Alice', score: 0.9, age: 30 }]])
    const columns = [
      { name: 'name', type: 'string' },
      { name: 'score', type: 'double' },
      { name: 'age', type: 'integer' },
    ]
    mockTables['net1'] = makeTableRecord(nodeRows, undefined, columns)

    const result = tableApi.getTable('net1', 'node', { columns: ['name'] })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.columns).toEqual([
        { name: 'id', type: 'string' },
        { name: 'name', type: 'string' },
      ])
      expect(result.data.rows[0]).toEqual({ id: 'n1', name: 'Alice' })
    }
  })

  it('includes id, source, and target for edge tables', () => {
    const edgeRows = new Map([['e1', { interaction: 'pp', weight: 0.8 }]])
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
      expect(result.data.columns[0]).toEqual({ name: 'id', type: 'string' })
      expect(result.data.columns[1]).toEqual({ name: 'source', type: 'string' })
      expect(result.data.columns[2]).toEqual({ name: 'target', type: 'string' })
      expect(result.data.rows[0].id).toBe('e1')
      expect(result.data.rows[0].source).toBe('n1')
      expect(result.data.rows[0].target).toBe('n2')
      expect(result.data.rows[0].interaction).toBe('pp')
    }
  })

  it('returns NetworkNotFound for invalid network', () => {
    const result = tableApi.getTable('missing', 'node')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
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
      // id is emitted by default so the export round-trips
      expect(lines[0]).toBe('id\tname\tscore')
      expect(lines[1]).toBe('n1\tAlice\t0.9')
      expect(lines[2]).toBe('n2\tBob\t0.5')
    }
  })

  it('omits the id column when includeId is false', () => {
    const nodeRows = new Map([['n1', { name: 'Alice', score: 0.9 }]])
    const columns = [
      { name: 'name', type: 'string' },
      { name: 'score', type: 'double' },
    ]
    mockTables['net1'] = makeTableRecord(nodeRows, undefined, columns)

    const result = tableApi.exportTableToTsv('net1', 'node', {
      includeId: false,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      const lines = result.data.tsvText.split('\n')
      expect(lines[0]).toBe('name\tscore')
      expect(lines[1]).toBe('Alice\t0.9')
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
      expect(lines[0]).toBe('id:string\tname:string')
    }
  })

  it('edge table TSV includes id, source, and target', () => {
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
      expect(lines[0]).toBe('id\tsource\ttarget\tweight')
      expect(lines[1]).toBe('e1\tn1\tn2\t0.8')
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
      'double',
      0,
    )
    expect(mockSetValues).toHaveBeenCalled()
  })

  it('persists the display config for each new column (#685)', async () => {
    const nodeRows = new Map([['n1', { name: 'Alice' }]])
    const columns = [{ name: 'name', type: 'string' }]
    mockTables['net1'] = makeTableRecord(nodeRows, undefined, columns)
    registerNet1(['n1'])
    seedUiStateWithColumns('net1', ['name'])

    const tsv = 'id\tname\tscore\trank\nn1\tAlice\t0.9\t2'
    expect(tableApi.importTableFromTsv('net1', 'node', tsv).success).toBe(true)

    expect(
      (await persistedDisplayConfigColumns('net1', 'nodeTable')).sort(),
    ).toEqual(['name', 'rank', 'score'])
  })

  it('treats source and target as ordinary columns on a node table', () => {
    const nodeRows = new Map([['n1', { name: 'Alice' }]])
    const columns = [{ name: 'name', type: 'string' }]
    mockTables['net1'] = makeTableRecord(nodeRows, undefined, columns)
    registerNet1(['n1'])

    const tsv = 'id\tsource\ttarget\nn1\tpubmed\tHGNC'
    const result = tableApi.importTableFromTsv('net1', 'node', tsv)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.newColumns).toEqual(['source', 'target'])
    }
    expect(mockCreateColumn).toHaveBeenCalledWith(
      'net1',
      'node',
      'source',
      'string',
      '',
    )
    expect(mockSetValues).toHaveBeenCalledWith('net1', 'node', [
      { row: 'n1', column: 'source', value: 'pubmed' },
      { row: 'n1', column: 'target', value: 'HGNC' },
    ])
  })

  it('skips the structural source and target columns on an edge table', () => {
    const edgeRows = new Map([['e1', { weight: 1 }]])
    const columns = [{ name: 'weight', type: 'double' }]
    mockTables['net1'] = makeTableRecord(
      new Map(),
      edgeRows,
      undefined,
      columns,
    )
    registerNet1(['n1'], ['e1'])

    const tsv = 'id\tsource\ttarget\tweight\ne1\tn1\tn1\t2.5'
    const result = tableApi.importTableFromTsv('net1', 'edge', tsv)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.newColumns).toEqual([])
    }
    expect(mockCreateColumn).not.toHaveBeenCalled()
    expect(mockSetValues).toHaveBeenCalledWith('net1', 'edge', [
      { row: 'e1', column: 'weight', value: 2.5 },
    ])
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
      0,
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
      expect(result.error.code).toBe(AppCodes.INVALID_INPUT.code)
    }
  })

  it('returns InvalidInput for TSV with only header', () => {
    mockTables['net1'] = makeTableRecord()

    const result = tableApi.importTableFromTsv('net1', 'node', 'id\tname')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.INVALID_INPUT.code)
    }
  })

  it('returns NetworkNotFound for invalid network', () => {
    const result = tableApi.importTableFromTsv(
      'missing',
      'node',
      'id\tname\nn1\tAlice',
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
    }
  })

  it('skips and reports unparseable numeric cells instead of coercing to 0', () => {
    const nodeRows = new Map([
      ['n1', { name: 'Alice' }],
      ['n2', { name: 'Bob' }],
    ])
    const columns = [
      { name: 'name', type: 'string' },
      { name: 'score', type: 'double' },
    ]
    mockTables['net1'] = makeTableRecord(nodeRows, undefined, columns)
    registerNet1(['n1', 'n2'])

    const tsv = 'id\tscore\nn1\tnot-a-number\nn2\t0.5'
    const result = tableApi.importTableFromTsv('net1', 'node', tsv)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.skippedCells).toEqual([
        { key: 'n1', column: 'score', value: 'not-a-number' },
      ])
    }
    // Only the parseable cell was written — never a coerced 0
    const edits = mockSetValues.mock.calls[0][2]
    expect(edits).toEqual([{ row: 'n2', column: 'score', value: 0.5 }])
  })

  it('treats empty non-string cells as absent instead of writing defaults', () => {
    const nodeRows = new Map([['n1', { name: 'Alice' }]])
    const columns = [
      { name: 'name', type: 'string' },
      { name: 'score', type: 'double' },
    ]
    mockTables['net1'] = makeTableRecord(nodeRows, undefined, columns)
    registerNet1(['n1'])

    const tsv = 'id\tscore\nn1\t'
    const result = tableApi.importTableFromTsv('net1', 'node', tsv)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.skippedCells).toEqual([])
    }
    const edits = mockSetValues.mock.calls[0][2]
    expect(edits).toEqual([])
  })

  it('rejects a forbidden new column name (CX2 FK1) before creating any columns', () => {
    const nodeRows = new Map([['n1', { name: 'Alice' }]])
    const columns = [{ name: 'name', type: 'string' }]
    mockTables['net1'] = makeTableRecord(nodeRows, undefined, columns)
    registerNet1(['n1'])

    // keyColumn is 'name', so the 'id' column is treated as data and
    // would previously have been created without validation
    const tsv = 'name\tid\nAlice\t99'
    const result = tableApi.importTableFromTsv('net1', 'node', tsv, {
      keyColumn: 'name',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(TableCodes.NODE_ID_COLUMN_FORBIDDEN.code)
    }
    expect(mockCreateColumn).not.toHaveBeenCalled()
    expect(mockSetValues).not.toHaveBeenCalled()
  })
})

// --- Round-trip: exportTableToTsv → importTableFromTsv -----------------------

describe('TSV round-trip', () => {
  it('default export → import preserves data (no manual id wrangling)', () => {
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

    // Export with defaults — the id column is emitted automatically
    const exportResult = tableApi.exportTableToTsv('net1', 'node', {
      includeTypeHeader: true,
    })
    expect(exportResult.success).toBe(true)
    if (!exportResult.success) return
    expect(exportResult.data.tsvText.split('\n')[0]).toContain('id')

    // Import the exported text directly — default keyColumn 'id' matches
    const importResult = tableApi.importTableFromTsv(
      'net1',
      'node',
      exportResult.data.tsvText,
    )
    expect(importResult.success).toBe(true)
    if (importResult.success) {
      expect(importResult.data.rowCount).toBe(2)
      expect(importResult.data.skippedRows).toEqual([])
      expect(importResult.data.skippedCells).toEqual([])
    }

    // Values written back match the originals (round-trip fidelity)
    const edits = mockSetValues.mock.calls[0][2]
    expect(edits).toContainEqual({ row: 'n1', column: 'name', value: 'Alice' })
    expect(edits).toContainEqual({ row: 'n1', column: 'score', value: 42 })
    expect(edits).toContainEqual({ row: 'n2', column: 'score', value: 18 })
  })
})

// --- networkModified flag (#680) ---------------------------------------------
//
// Before #680 no path in src/app-api/ set the flag. An NDEx-backed network
// with app-added columns was therefore skipped by Save Workspace and offered a
// disabled "Save to NDEx" entry: the app's write was unreachable.
//
// The flag is now written by markNetworkModified, either directly or through
// corePostEdit. Every write method needs its own case — the defect was one
// module forgetting one call, and a shared helper test would not catch that.

describe('networkModified (#680)', () => {
  /** The single networkId every mark in this block must be keyed on. */
  const NET = 'net2'

  /** Registers `net2` in the stores as a resident, non-current network. */
  function registerNet2(nodes: string[], columns: any[] = []): void {
    mockTables[NET] = makeTableRecord(
      new Map(nodes.map((id) => [id, { name: id, score: 1 }])),
      undefined,
      columns,
    )
    mockNetworks.set(NET, {
      id: NET,
      nodes: nodes.map((id) => ({ id })),
      edges: [],
    })
  }

  const marked = () =>
    mockSetNetworkModified.mock.calls.filter(
      ([id, isModified]) => id === NET && isModified === true,
    ).length

  it('createColumn marks the network', () => {
    registerNet2(['n1'])

    expect(
      tableApi.createColumn(NET, 'node', 'newCol', 'string', 'x').success,
    ).toBe(true)
    expect(marked()).toBeGreaterThan(0)
  })

  it('deleteColumn marks the network', () => {
    registerNet2(['n1'], [{ name: 'score', type: 'long' }])

    expect(tableApi.deleteColumn(NET, 'node', 'score').success).toBe(true)
    expect(marked()).toBeGreaterThan(0)
  })

  it('renameColumn marks the network', () => {
    registerNet2(['n1'], [{ name: 'score', type: 'long' }])

    expect(tableApi.renameColumn(NET, 'node', 'score', 'weight').success).toBe(
      true,
    )
    expect(marked()).toBeGreaterThan(0)
  })

  it('setValue marks the network', () => {
    registerNet2(['n1'])

    expect(tableApi.setValue(NET, 'node', 'n1', 'name', 'Bob').success).toBe(
      true,
    )
    expect(marked()).toBeGreaterThan(0)
  })

  it('setValues marks the network', () => {
    registerNet2(['n1'])

    const result = tableApi.setValues(NET, 'node', [
      { id: 'n1', column: 'name', value: 'Bob' },
    ])

    expect(result.success).toBe(true)
    expect(marked()).toBeGreaterThan(0)
  })

  it('editRows marks the network', () => {
    registerNet2(['n1'])

    const result = tableApi.editRows(NET, 'node', { n1: { name: 'Bob' } })

    expect(result.success).toBe(true)
    expect(marked()).toBeGreaterThan(0)
  })

  it('applyValueToElements marks the network', () => {
    registerNet2(['n1', 'n2'])

    const result = tableApi.applyValueToElements(NET, 'node', 'name', 'x', [
      'n1',
    ])

    expect(result.success).toBe(true)
    expect(marked()).toBeGreaterThan(0)
  })

  it('importTableFromTsv marks the network', () => {
    registerNet2(['n1'], [{ name: 'name', type: 'string' }])

    const result = tableApi.importTableFromTsv(
      NET,
      'node',
      'id\tname\nn1\tAlice',
    )

    expect(result.success).toBe(true)
    expect(marked()).toBeGreaterThan(0)
  })

  // The case the deleted WorkspaceEditor subscriptions could never cover:
  // both selected on `currentNetworkId`, while every app API method takes an
  // explicit networkId and non-current networks stay resident in the stores.
  it('marks the written network, not currentNetworkId', () => {
    registerNet2(['n1'])

    tableApi.createColumn(NET, 'node', 'newCol', 'string', 'x')

    expect(mockSetNetworkModified).toHaveBeenCalledWith(NET, true)
    expect(mockSetNetworkModified).not.toHaveBeenCalledWith('net1', true)
  })

  it('does not mark when the write fails validation', () => {
    registerNet2(['n1'])

    // 'ghost' is not in the network — rejected before any store write
    const result = tableApi.setValue(NET, 'node', 'ghost', 'name', 'Bob')

    expect(result.success).toBe(false)
    expect(mockSetNetworkModified).not.toHaveBeenCalled()
  })

  it('does not mark when the network does not exist', () => {
    const result = tableApi.createColumn(
      'missing',
      'node',
      'newCol',
      'string',
      'x',
    )

    expect(result.success).toBe(false)
    expect(mockSetNetworkModified).not.toHaveBeenCalled()
  })

  it('does not mark a TSV import whose every key missed the network', () => {
    registerNet2(['n1'], [{ name: 'name', type: 'string' }])

    const result = tableApi.importTableFromTsv(
      NET,
      'node',
      'id\tname\nghost\tAlice',
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.skippedRows).toEqual(['ghost'])
    }
    expect(mockSetNetworkModified).not.toHaveBeenCalled()
  })
})

// --- Undo recording (#680) ---------------------------------------------------
//
// Table writes through the app API used to record nothing, so they were not
// undoable. The params must match what useUndoStack's handlers replay, or
// undo corrupts the table instead of restoring it.

describe('undo recording (#680)', () => {
  /** The Edit pushed onto net1's undo stack by the last write. */
  const lastEdit = () => mockSetUndoStack.mock.calls.at(-1)?.[1].at(-1)

  it('setValue records SET_CELL_VALUE with the overwritten value', () => {
    mockTables['net1'] = makeTableRecord(new Map([['n1', { name: 'Alice' }]]))
    registerNet1(['n1'])

    tableApi.setValue('net1', 'node', 'n1', 'name', 'Bob')

    // [networkId, tableType, elementId, column, value] — the shape
    // useUndoStack's SET_CELL_VALUE handler feeds to setValue
    expect(lastEdit()).toMatchObject({
      undoCommand: 'SET_CELL_VALUE',
      undoParams: ['net1', 'node', 'n1', 'name', 'Alice'],
      redoParams: ['net1', 'node', 'n1', 'name', 'Bob'],
    })
  })

  it('setValue records an empty string for a cell that had no value', () => {
    mockTables['net1'] = makeTableRecord(new Map([['n1', {}]]))
    registerNet1(['n1'])

    tableApi.setValue('net1', 'node', 'n1', 'name', 'Bob')

    expect(lastEdit().undoParams[4]).toBe('')
  })

  it('renameColumn records RENAME_COLUMN with the names swapped for undo', () => {
    mockTables['net1'] = makeTableRecord(new Map(), undefined, [
      { name: 'score', type: 'long' },
    ])

    tableApi.renameColumn('net1', 'node', 'score', 'weight')

    expect(lastEdit()).toMatchObject({
      undoParams: ['net1', 'node', 'weight', 'score'],
      redoParams: ['net1', 'node', 'score', 'weight'],
    })
  })

  it('deleteColumn records the pre-delete table for undo', () => {
    const table = makeTableRecord(new Map([['n1', { score: 7 }]]), undefined, [
      { name: 'score', type: 'long' },
    ])
    mockTables['net1'] = table

    tableApi.deleteColumn('net1', 'node', 'score')

    const edit = lastEdit()
    expect(edit.undoCommand).toBe('DELETE_COLUMN')
    // params[2] is restored wholesale by setTable; params[3].id is the
    // column redo deletes again
    expect(edit.undoParams[2]).toBe(table.nodeTable)
    expect(edit.redoParams[3]).toEqual({ id: 'score' })
  })

  it('applyValueToElements with no ids covers every row and uses APPLY_VALUE_TO_COLUMN', () => {
    mockTables['net1'] = makeTableRecord(
      new Map([
        ['n1', { score: 1 }],
        ['n2', { score: 2 }],
      ]),
    )

    tableApi.applyValueToElements('net1', 'node', 'score', 9)

    const edit = lastEdit()
    expect(edit.undoCommand).toBe('APPLY_VALUE_TO_COLUMN')
    expect(edit.undoParams[2]).toEqual([
      { row: 'n1', column: 'score', value: 1 },
      { row: 'n2', column: 'score', value: 2 },
    ])
    expect(edit.redoParams[2]).toEqual([
      { row: 'n1', column: 'score', value: 9 },
      { row: 'n2', column: 'score', value: 9 },
    ])
  })

  it('editRows records the touched cells only, not whole rows', () => {
    mockTables['net1'] = makeTableRecord(
      new Map([['n1', { name: 'Alice', score: 1 }]]),
    )
    registerNet1(['n1'])

    tableApi.editRows('net1', 'node', { n1: { score: 5 } })

    const edit = lastEdit()
    expect(edit.undoParams[2]).toEqual([
      { row: 'n1', column: 'score', value: 1 },
    ])
    expect(edit.redoParams[2]).toEqual([
      { row: 'n1', column: 'score', value: 5 },
    ])
  })

  it('createColumn records no undo entry — no CREATE_COLUMN command exists', () => {
    mockTables['net1'] = makeTableRecord()

    tableApi.createColumn('net1', 'node', 'newCol', 'string', 'x')

    expect(mockSetUndoStack).not.toHaveBeenCalled()
    expect(mockSetNetworkModified).toHaveBeenCalledWith('net1', true)
  })

  it('importTableFromTsv records no undo entry — it also creates columns', () => {
    mockTables['net1'] = makeTableRecord(new Map([['n1', {}]]), undefined, [
      { name: 'name', type: 'string' },
    ])
    registerNet1(['n1'])

    tableApi.importTableFromTsv('net1', 'node', 'id\tname\nn1\tAlice')

    expect(mockSetUndoStack).not.toHaveBeenCalled()
    expect(mockSetNetworkModified).toHaveBeenCalledWith('net1', true)
  })
})

// --- No-op writes (#680) -----------------------------------------------------
//
// A write that changes nothing must not mark the network. `applyValueToElements`
// is the sharp edge: omitting elementIds applies to every row, but passing an
// empty array applies to none (tableImpl branches on `!= null`), so the two
// cannot share an undo snapshot.

describe('no-op writes (#680)', () => {
  it('applyValueToElements with an empty id list records and marks nothing', () => {
    mockTables['net1'] = makeTableRecord(new Map([['n1', { score: 1 }]]))

    const result = tableApi.applyValueToElements('net1', 'node', 'score', 9, [])

    expect(result.success).toBe(true)
    expect(mockSetUndoStack).not.toHaveBeenCalled()
    expect(mockSetNetworkModified).not.toHaveBeenCalled()
  })

  it('setValues with no edits records and marks nothing', () => {
    mockTables['net1'] = makeTableRecord(new Map([['n1', { score: 1 }]]))
    registerNet1(['n1'])

    const result = tableApi.setValues('net1', 'node', [])

    expect(result.success).toBe(true)
    expect(mockSetUndoStack).not.toHaveBeenCalled()
    expect(mockSetNetworkModified).not.toHaveBeenCalled()
  })

  it('editRows with no rows records and marks nothing', () => {
    mockTables['net1'] = makeTableRecord(new Map([['n1', { score: 1 }]]))
    registerNet1(['n1'])

    const result = tableApi.editRows('net1', 'node', {})

    expect(result.success).toBe(true)
    expect(mockSetUndoStack).not.toHaveBeenCalled()
    expect(mockSetNetworkModified).not.toHaveBeenCalled()
  })
})
