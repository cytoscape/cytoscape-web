// src/app-api/core/tableApi.ts
// Framework-agnostic Table API core — zero React imports.
// All store access via .getState(); no React hook subscriptions.

import { useNetworkStore } from '../../data/hooks/stores/NetworkStore'
import { useTableStore } from '../../data/hooks/stores/TableStore'
import { useUiStateStore } from '../../data/hooks/stores/UiStateStore'
import { IdType } from '../../models/IdType'
import { Column } from '../../models/TableModel/Column'
import {
  CellEdit as StoreCellEdit,
  TableType,
} from '../../models/StoreModel/TableStoreModel'
import {
  AttributeName,
  ValueType,
  ValueTypeName,
} from '../../models/TableModel'
import { ApiErrorCode, ApiResult, fail, ok } from '../types/ApiResult'

// ── Public types ─────────────────────────────────────────────────────────────

/** Table type accepted by the app API */
export type AppTableType = 'node' | 'edge'

/**
 * App API CellEdit — uses `id` (not `row`) to identify the element.
 * The store uses `row`; we convert internally.
 */
export interface CellEdit {
  id: IdType
  column: AttributeName
  value: ValueType
}

/** Column metadata returned by getTable() */
export interface ColumnInfo {
  name: string
  type: ValueTypeName
}

/** Options for getTable() */
export interface GetTableOptions {
  columns?: string[]
}

/** Options for exportTableToTsv() */
export interface ExportTableToTsvOptions {
  columns?: string[]
  includeTypeHeader?: boolean
}

/** Options for importTableFromTsv() */
export interface ImportTableFromTsvOptions {
  keyColumn?: string
}

export interface TableApi {
  // --- Read ---
  getValue(
    networkId: IdType,
    tableType: AppTableType,
    elementId: IdType,
    column: AttributeName,
  ): ApiResult<{ value: ValueType }>

  getRow(
    networkId: IdType,
    tableType: AppTableType,
    elementId: IdType,
  ): ApiResult<{ row: Record<AttributeName, ValueType> }>

  getTable(
    networkId: IdType,
    tableType: AppTableType,
    options?: GetTableOptions,
  ): ApiResult<{
    columns: ColumnInfo[]
    rows: Array<Record<string, ValueType>>
  }>

  // --- TSV I/O ---
  exportTableToTsv(
    networkId: IdType,
    tableType: AppTableType,
    options?: ExportTableToTsvOptions,
  ): ApiResult<{ tsvText: string }>

  importTableFromTsv(
    networkId: IdType,
    tableType: AppTableType,
    tsvText: string,
    options?: ImportTableFromTsvOptions,
  ): ApiResult<{ rowCount: number; newColumns: string[] }>

  // --- Write ---
  createColumn(
    networkId: IdType,
    tableType: AppTableType,
    columnName: string,
    dataType: ValueTypeName,
    defaultValue: ValueType,
  ): ApiResult

  deleteColumn(
    networkId: IdType,
    tableType: AppTableType,
    columnName: string,
  ): ApiResult

  setColumnName(
    networkId: IdType,
    tableType: AppTableType,
    currentName: string,
    newName: string,
  ): ApiResult

  setValue(
    networkId: IdType,
    tableType: AppTableType,
    elementId: IdType,
    column: AttributeName,
    value: ValueType,
  ): ApiResult

  setValues(
    networkId: IdType,
    tableType: AppTableType,
    cellEdits: CellEdit[],
  ): ApiResult

  editRows(
    networkId: IdType,
    tableType: AppTableType,
    rows: Record<IdType, Record<AttributeName, ValueType>>,
  ): ApiResult

  applyValueToElements(
    networkId: IdType,
    tableType: AppTableType,
    columnName: string,
    value: ValueType,
    elementIds?: IdType[],
  ): ApiResult
}

// ── Private helpers ──────────────────────────────────────────────────────────

/** Resolves 'node'|'edge' to the key used in TableRecord */
function tableKey(tableType: AppTableType): 'nodeTable' | 'edgeTable' {
  return tableType === 'node' ? 'nodeTable' : 'edgeTable'
}

/**
 * Add a column to the tableDisplayConfiguration in UiStateStore so the
 * Table Browser shows newly created columns. Without this, columns created
 * via the API exist in the data but are invisible in the UI.
 */
function syncColumnToTableDisplayConfig(
  networkId: IdType,
  tableType: AppTableType,
  columnName: string,
): void {
  const configKey = tableType === 'node' ? 'nodeTable' : 'edgeTable'
  // Directly mutate the Immer-managed state to add the column entry.
  // Using setTableDisplayConfiguration triggers toPlainObject + IndexedDB
  // write which can hang inside page.evaluate(). This minimal mutation
  // is safe because it runs inside the same synchronous call stack as
  // createColumn, and the next DB persist cycle will pick it up.
  useUiStateStore.setState((state: any) => {
    const tdc =
      state.ui?.visualStyleOptions?.[networkId]?.visualEditorProperties
        ?.tableDisplayConfiguration
    if (!tdc?.[configKey]?.columnConfiguration) return state

    const colConfig = tdc[configKey].columnConfiguration
    const exists = colConfig.some(
      (c: { attributeName: string }) => c.attributeName === columnName,
    )
    if (exists) return state

    tdc[configKey].columnConfiguration = [
      { attributeName: columnName, visible: true, columnWidth: undefined },
      ...colConfig,
    ]
    return state
  })
}

// ── Core implementation ──────────────────────────────────────────────────────

export const tableApi: TableApi = {
  getValue(networkId, tableType, elementId, column): ApiResult<{ value: ValueType }> {
    try {
      const tableRecord = useTableStore.getState().tables[networkId]
      if (tableRecord === undefined) {
        return fail(ApiErrorCode.NetworkNotFound, `Network ${networkId} not found`)
      }
      const table = tableRecord[tableKey(tableType)]
      const row = table?.rows?.get(elementId)
      if (row === undefined) {
        const code =
          tableType === 'node'
            ? ApiErrorCode.NodeNotFound
            : ApiErrorCode.EdgeNotFound
        return fail(code, `Element ${elementId} not found in ${tableType} table`)
      }
      return ok({ value: row[column] as ValueType })
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  getRow(networkId, tableType, elementId): ApiResult<{ row: Record<AttributeName, ValueType> }> {
    try {
      const tableRecord = useTableStore.getState().tables[networkId]
      if (tableRecord === undefined) {
        return fail(ApiErrorCode.NetworkNotFound, `Network ${networkId} not found`)
      }
      const table = tableRecord[tableKey(tableType)]
      const row = table?.rows?.get(elementId)
      if (row === undefined) {
        const code =
          tableType === 'node'
            ? ApiErrorCode.NodeNotFound
            : ApiErrorCode.EdgeNotFound
        return fail(code, `Element ${elementId} not found in ${tableType} table`)
      }
      return ok({ row: row as Record<AttributeName, ValueType> })
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  createColumn(networkId, tableType, columnName, dataType, defaultValue): ApiResult {
    try {
      const tableRecord = useTableStore.getState().tables[networkId]
      if (tableRecord === undefined) {
        return fail(ApiErrorCode.NetworkNotFound, `Network ${networkId} not found`)
      }
      useTableStore
        .getState()
        .createColumn(networkId, tableType, columnName, dataType, defaultValue)

      // Schedule table display config sync asynchronously to avoid
      // blocking page.evaluate() — the Immer + IndexedDB persist cycle
      // in UiStateStore can hang when called synchronously from CDP.
      setTimeout(() => {
        try {
          syncColumnToTableDisplayConfig(networkId, tableType, columnName)
        } catch {
          // Best-effort
        }
      }, 0)

      return ok()
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  deleteColumn(networkId, tableType, columnName): ApiResult {
    try {
      const tableRecord = useTableStore.getState().tables[networkId]
      if (tableRecord === undefined) {
        return fail(ApiErrorCode.NetworkNotFound, `Network ${networkId} not found`)
      }
      useTableStore.getState().deleteColumn(networkId, tableType, columnName)
      return ok()
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  setColumnName(networkId, tableType, currentName, newName): ApiResult {
    try {
      const tableRecord = useTableStore.getState().tables[networkId]
      if (tableRecord === undefined) {
        return fail(ApiErrorCode.NetworkNotFound, `Network ${networkId} not found`)
      }
      useTableStore
        .getState()
        .setColumnName(networkId, tableType, currentName, newName)
      return ok()
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  setValue(networkId, tableType, elementId, column, value): ApiResult {
    try {
      const tableRecord = useTableStore.getState().tables[networkId]
      if (tableRecord === undefined) {
        return fail(ApiErrorCode.NetworkNotFound, `Network ${networkId} not found`)
      }
      useTableStore
        .getState()
        .setValue(networkId, tableType as TableType, elementId, column, value)
      return ok()
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  setValues(networkId, tableType, cellEdits): ApiResult {
    try {
      const tableRecord = useTableStore.getState().tables[networkId]
      if (tableRecord === undefined) {
        return fail(ApiErrorCode.NetworkNotFound, `Network ${networkId} not found`)
      }
      // Convert app API CellEdit {id, column, value} → store CellEdit {row, column, value}
      const storeCellEdits: StoreCellEdit[] = cellEdits.map((edit) => ({
        row: edit.id,
        column: edit.column,
        value: edit.value,
      }))
      useTableStore
        .getState()
        .setValues(networkId, tableType as TableType, storeCellEdits)
      return ok()
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  editRows(networkId, tableType, rows): ApiResult {
    try {
      const tableRecord = useTableStore.getState().tables[networkId]
      if (tableRecord === undefined) {
        return fail(ApiErrorCode.NetworkNotFound, `Network ${networkId} not found`)
      }
      // Convert app API Record<IdType, Record<...>> → store Map<IdType, Record<...>>
      const rowsMap = new Map<IdType, Record<AttributeName, ValueType>>(
        Object.entries(rows) as Array<
          [IdType, Record<AttributeName, ValueType>]
        >,
      )
      useTableStore
        .getState()
        .editRows(networkId, tableType as TableType, rowsMap)
      return ok()
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  applyValueToElements(networkId, tableType, columnName, value, elementIds): ApiResult {
    try {
      const tableRecord = useTableStore.getState().tables[networkId]
      if (tableRecord === undefined) {
        return fail(ApiErrorCode.NetworkNotFound, `Network ${networkId} not found`)
      }
      useTableStore
        .getState()
        .applyValueToElements(networkId, tableType, columnName, value, elementIds)
      return ok()
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  // --- getTable ---------------------------------------------------------------

  getTable(networkId, tableType, options) {
    try {
      const tableRecord = useTableStore.getState().tables[networkId]
      if (tableRecord === undefined) {
        return fail(ApiErrorCode.NetworkNotFound, `Network ${networkId} not found`)
      }
      const table = tableRecord[tableKey(tableType)]
      const allColumns: Column[] = table?.columns ?? []
      const requestedCols = options?.columns
      const filteredColumns = requestedCols
        ? allColumns.filter((c) => requestedCols.includes(c.name))
        : allColumns

      // For edge tables, prepend source/target from the network model
      const edgeLookup =
        tableType === 'edge' ? buildEdgeLookup(networkId) : undefined

      const rows: Array<Record<string, ValueType>> = []
      const tableRows = table?.rows
      if (tableRows) {
        tableRows.forEach(
          (rowData: Record<AttributeName, ValueType>, elementId: IdType) => {
            const row: Record<string, ValueType> = {}
            if (edgeLookup) {
              const edge = edgeLookup.get(elementId)
              if (edge) {
                row['source'] = edge.s
                row['target'] = edge.t
              }
            }
            for (const col of filteredColumns) {
              row[col.name] = rowData[col.name] as ValueType
            }
            rows.push(row)
          },
        )
      }

      // Build column info (with source/target prepended for edge table)
      const columnInfos: ColumnInfo[] = []
      if (edgeLookup) {
        columnInfos.push(
          { name: 'source', type: ValueTypeName.String },
          { name: 'target', type: ValueTypeName.String },
        )
      }
      for (const col of filteredColumns) {
        columnInfos.push({ name: col.name, type: col.type })
      }

      return ok({ columns: columnInfos, rows })
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  // --- exportTableToTsv -------------------------------------------------------

  exportTableToTsv(networkId, tableType, options) {
    const result = tableApi.getTable(networkId, tableType, {
      columns: options?.columns,
    })
    if (!result.success) return result

    const { columns, rows } = result.data
    const includeType = options?.includeTypeHeader ?? false

    // Header line
    const header = columns
      .map((c) => (includeType ? `${c.name}:${c.type}` : c.name))
      .join('\t')

    // Data lines
    const dataLines = rows.map((row) =>
      columns.map((c) => formatTsvValue(row[c.name])).join('\t'),
    )

    return ok({ tsvText: [header, ...dataLines].join('\n') })
  },

  // --- importTableFromTsv -----------------------------------------------------

  importTableFromTsv(networkId, tableType, tsvText, options) {
    try {
      const tableRecord = useTableStore.getState().tables[networkId]
      if (tableRecord === undefined) {
        return fail(ApiErrorCode.NetworkNotFound, `Network ${networkId} not found`)
      }
      const table = tableRecord[tableKey(tableType)]
      const existingColumns = new Map(
        (table?.columns ?? []).map((c: Column) => [c.name, c.type]),
      )

      const lines = tsvText.split('\n').filter((l) => l.trim() !== '')
      if (lines.length < 2) {
        return fail(
          ApiErrorCode.InvalidInput,
          'TSV must have at least a header line and one data line',
        )
      }

      // Parse header — detect optional type annotations (name:type)
      const headerFields = lines[0].split('\t')
      const colNames: string[] = []
      const colTypes: Map<string, ValueTypeName> = new Map()
      for (const field of headerFields) {
        const colonIdx = field.lastIndexOf(':')
        if (colonIdx > 0) {
          const name = field.slice(0, colonIdx)
          const typePart = field.slice(colonIdx + 1)
          if (isValidTypeName(typePart)) {
            colNames.push(name)
            colTypes.set(name, typePart as ValueTypeName)
            continue
          }
        }
        colNames.push(field)
      }

      const keyColumn = options?.keyColumn ?? 'id'
      const keyIndex = colNames.indexOf(keyColumn)
      if (keyIndex < 0) {
        return fail(
          ApiErrorCode.InvalidInput,
          `Key column "${keyColumn}" not found in TSV header`,
        )
      }

      // Create any missing columns
      const newColumns: string[] = []
      const storeState = useTableStore.getState()
      for (const colName of colNames) {
        if (colName === keyColumn) continue
        if (colName === 'source' || colName === 'target') continue
        if (!existingColumns.has(colName)) {
          const inferredType =
            colTypes.get(colName) ?? inferTypeFromData(lines, colNames, colName)
          storeState.createColumn(
            networkId,
            tableType,
            colName,
            inferredType,
            '',
          )
          newColumns.push(colName)
          // Sync to Table Browser display config
          setTimeout(() => {
            try {
              syncColumnToTableDisplayConfig(networkId, tableType, colName)
            } catch {
              // Best-effort
            }
          }, 0)
        }
      }

      // Build rows map — merge with existing row data so we don't
      // overwrite attributes not present in the TSV
      const existingTable = useTableStore.getState().tables[networkId]?.[
        tableKey(tableType)
      ]
      const rowsMap = new Map<
        IdType,
        Record<AttributeName, ValueType>
      >()
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split('\t')
        const rowId = values[keyIndex]
        if (!rowId) continue
        // Start from existing row data (preserve all existing attributes)
        const existingRow = existingTable?.rows?.get(rowId)
        const rowData: Record<AttributeName, ValueType> = existingRow
          ? { ...existingRow }
          : {}
        // Overlay only the columns present in the TSV
        for (let j = 0; j < colNames.length; j++) {
          const colName = colNames[j]
          if (colName === keyColumn) continue
          if (colName === 'source' || colName === 'target') continue
          const rawValue = values[j] ?? ''
          const colType =
            colTypes.get(colName) ?? existingColumns.get(colName) ?? 'string'
          rowData[colName] = parseTsvValue(rawValue, colType as ValueTypeName)
        }
        rowsMap.set(rowId, rowData)
      }

      storeState.editRows(
        networkId,
        tableType as TableType,
        rowsMap,
      )

      return ok({ rowCount: rowsMap.size, newColumns })
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },
}

// ── TSV helpers ───────────────────────────────────────────────────────────────

/** Build edge id → {s, t} lookup from NetworkStore */
function buildEdgeLookup(
  networkId: IdType,
): Map<IdType, { s: IdType; t: IdType }> {
  const lookup = new Map<IdType, { s: IdType; t: IdType }>()
  const network = useNetworkStore.getState().networks.get(networkId)
  if (network) {
    for (const edge of network.edges) {
      lookup.set(edge.id, { s: edge.s, t: edge.t })
    }
  }
  return lookup
}

/** Format a value for TSV output */
function formatTsvValue(value: ValueType): string {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return value.join('|')
  return String(value)
}

/** Valid ValueTypeName strings */
const VALID_TYPE_NAMES = new Set<string>(Object.values(ValueTypeName))

function isValidTypeName(s: string): boolean {
  return VALID_TYPE_NAMES.has(s)
}

/** Parse a TSV cell value according to its type */
function parseTsvValue(raw: string, type: ValueTypeName): ValueType {
  if (raw === '') return ''
  switch (type) {
    case ValueTypeName.Long:
    case ValueTypeName.Integer:
      return parseInt(raw, 10) || 0
    case ValueTypeName.Double:
      return parseFloat(raw) || 0
    case ValueTypeName.Boolean:
      return raw.toLowerCase() === 'true'
    case ValueTypeName.ListString:
      return raw.split('|')
    case ValueTypeName.ListLong:
    case ValueTypeName.ListInteger:
      return raw.split('|').map((v) => parseInt(v, 10) || 0)
    case ValueTypeName.ListDouble:
      return raw.split('|').map((v) => parseFloat(v) || 0)
    case ValueTypeName.ListBoolean:
      return raw.split('|').map((v) => v.toLowerCase() === 'true')
    default:
      return raw
  }
}

/** Infer column type from the first few non-empty data values */
function inferTypeFromData(
  lines: string[],
  colNames: string[],
  colName: string,
): ValueTypeName {
  const colIdx = colNames.indexOf(colName)
  if (colIdx < 0) return ValueTypeName.String
  const samples: string[] = []
  for (let i = 1; i < Math.min(lines.length, 6); i++) {
    const val = lines[i].split('\t')[colIdx]
    if (val && val.trim() !== '') samples.push(val.trim())
  }
  if (samples.length === 0) return ValueTypeName.String
  if (samples.every((s) => /^-?\d+$/.test(s))) return ValueTypeName.Long
  if (samples.every((s) => /^-?\d*\.?\d+([eE][+-]?\d+)?$/.test(s)))
    return ValueTypeName.Double
  if (
    samples.every(
      (s) => s.toLowerCase() === 'true' || s.toLowerCase() === 'false',
    )
  )
    return ValueTypeName.Boolean
  return ValueTypeName.String
}
