// src/app-api/core/tableApi.ts
// Framework-agnostic Table API core — zero React imports.
// All store access via .getState(); no React hook subscriptions.

import { useNetworkStore } from '../../data/hooks/stores/NetworkStore'
import { useTableStore } from '../../data/hooks/stores/TableStore'
import { useUiStateStore } from '../../data/hooks/stores/UiStateStore'
import { useVisualStyleStore } from '../../data/hooks/stores/VisualStyleStore'
import { IdType } from '../../models/IdType'
import {
  CellEdit as StoreCellEdit,
  TableType,
} from '../../models/StoreModel/TableStoreModel'
import { UndoCommandType } from '../../models/StoreModel/UndoStoreModel'
import {
  AttributeName,
  Table,
  ValueType,
  ValueTypeName,
} from '../../models/TableModel'
import { Column } from '../../models/TableModel/Column'
import { VisualPropertyName } from '../../models/VisualStyleModel'
import {
  ColumnConfiguration,
  TableConfig,
} from '../../models/VisualStyleModel/VisualStyleOptions'
import { AppCodes, ApiResult, ElementCodes, fail, ok } from '../types/ApiResult'
import { TableCodes } from '../types/ApiResult'
import { corePostEdit, markNetworkModified } from './undo'
import {
  validateColumnDefaultValue,
  validateColumnName,
  validateColumnNameAvailable,
  validateTableElementsExist,
  validateValuesMatchColumnTypes,
  valueMatchesType,
} from './validation'

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
  /**
   * Include the element id on each row (and as a leading `id` column) so
   * rows can be mapped back to nodes/edges. Defaults to true.
   */
  includeId?: boolean
}

/** Options for exportTableToTsv() */
export interface ExportTableToTsvOptions {
  columns?: string[]
  includeTypeHeader?: boolean
  /**
   * Emit a leading `id` column holding each element's id. Defaults to
   * true so the export round-trips through importTableFromTsv (whose
   * default keyColumn is `id`). Set false for a data-only export.
   */
  includeId?: boolean
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

  /**
   * Return only the column definitions (the table schema) without
   * loading any rows — cheap on large tables where getTable would
   * materialize every row.
   */
  getColumns(
    networkId: IdType,
    tableType: AppTableType,
  ): ApiResult<{ columns: ColumnInfo[] }>

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
  ): ApiResult<{
    rowCount: number
    newColumns: string[]
    /** TSV key values that matched no element in the network */
    skippedRows: string[]
    /**
     * Non-empty cells whose value could not be parsed as the column's
     * type. Skipped instead of being silently coerced.
     */
    skippedCells: Array<{ key: string; column: string; value: string }>
  }>

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

  renameColumn(
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
 * Apply an update to one table's columnConfiguration in the
 * tableDisplayConfiguration (UiStateStore).
 *
 * Goes through `setTableDisplayConfiguration` so the change reaches the
 * `uiState` row in IndexedDB. An earlier version wrote the configuration
 * with a raw `useUiStateStore.setState`, which the store does not persist:
 * the column showed up in the Table Browser and then vanished on the next
 * reload, unless an unrelated setter happened to flush the row first (#685).
 *
 * Does nothing when the network has no display configuration — the Table
 * Browser then falls back to the table's own columns, which are already
 * correct.
 */
function updateTableDisplayConfigColumns(
  networkId: IdType,
  tableType: AppTableType,
  update: (cols: ColumnConfiguration[]) => ColumnConfiguration[],
): void {
  const configKey = tableKey(tableType)
  const tdc =
    useUiStateStore.getState().ui?.visualStyleOptions?.[networkId]
      ?.visualEditorProperties?.tableDisplayConfiguration
  const tableConfig = tdc?.[configKey]
  if (tdc === undefined || tableConfig?.columnConfiguration === undefined) {
    return
  }

  const nextTableConfig: TableConfig = {
    ...tableConfig,
    columnConfiguration: update(tableConfig.columnConfiguration),
  }
  useUiStateStore
    .getState()
    .setTableDisplayConfiguration(
      networkId,
      configKey === 'nodeTable'
        ? { ...tdc, nodeTable: nextTableConfig }
        : { ...tdc, edgeTable: nextTableConfig },
    )
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
  updateTableDisplayConfigColumns(networkId, tableType, (cols) =>
    cols.some((c) => c.attributeName === columnName)
      ? cols
      : [
          { attributeName: columnName, visible: true, columnWidth: undefined },
          ...cols,
        ],
  )
}

/**
 * Retarget (newName given) or remove (newName undefined) visual style
 * mappings that reference a column, limited to visual properties of the
 * matching element group. Mirrors the Table Browser cascade so external
 * column edits cannot leave mappings pointing at a non-existent
 * attribute (CX2 MI1 / RC3).
 */
function cascadeColumnToMappings(
  networkId: IdType,
  tableType: AppTableType,
  columnName: string,
  newName?: string,
): void {
  const visualStyle = useVisualStyleStore.getState().visualStyles[networkId]
  if (visualStyle === undefined) return

  const setMapping = useVisualStyleStore.getState().setMapping
  Object.entries(visualStyle).forEach(([vpName, vp]) => {
    if (vp?.group !== tableType || vp?.mapping?.attribute !== columnName) {
      return
    }
    setMapping(
      networkId,
      vpName as VisualPropertyName,
      newName === undefined ? undefined : { ...vp.mapping, attribute: newName },
    )
  })
}

/**
 * Snapshot of the cells a write is about to overwrite, in the shape
 * `useUndoStack`'s APPLY_VALUE_TO_SELECTED handler replays (`setValues`).
 *
 * A cell with no stored value is recorded as an empty string, matching what
 * the in-app table paths hand to `postEdit` for an empty cell.
 */
function previousCellEdits(
  table: Table | undefined,
  edits: Array<{ row: IdType; column: AttributeName }>,
): StoreCellEdit[] {
  return edits.map(({ row, column }) => ({
    row,
    column,
    value: table?.rows.get(row)?.[column] ?? '',
  }))
}

// ── Core implementation ──────────────────────────────────────────────────────

export const tableApi: TableApi = {
  getValue(
    networkId,
    tableType,
    elementId,
    column,
  ): ApiResult<{ value: ValueType }> {
    try {
      const tableRecord = useTableStore.getState().tables[networkId]
      if (tableRecord === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      const table = tableRecord[tableKey(tableType)]
      const row = table?.rows?.get(elementId)
      if (row === undefined) {
        return fail(
          tableType === 'node'
            ? ElementCodes.NODE_NOT_FOUND
            : ElementCodes.EDGE_NOT_FOUND,
          elementId,
        )
      }
      // source/target are pseudo-columns synthesized from the network
      // model for edge tables (matching getTable/getColumns)
      if (
        tableType === 'edge' &&
        (column === 'source' || column === 'target')
      ) {
        const edge = useNetworkStore
          .getState()
          .networks.get(networkId)
          ?.edges.find((e) => e.id === elementId)
        if (edge === undefined) {
          return fail(ElementCodes.EDGE_NOT_FOUND, elementId)
        }
        return ok({ value: column === 'source' ? edge.s : edge.t })
      }
      const declared = (table?.columns ?? []).some((c) => c.name === column)
      if (!declared && !(column in row)) {
        return fail(AppCodes.COLUMN_NOT_FOUND, column, tableType)
      }
      return ok({ value: row[column] as ValueType })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  getRow(
    networkId,
    tableType,
    elementId,
  ): ApiResult<{ row: Record<AttributeName, ValueType> }> {
    try {
      const tableRecord = useTableStore.getState().tables[networkId]
      if (tableRecord === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      const table = tableRecord[tableKey(tableType)]
      const row = table?.rows?.get(elementId)
      if (row === undefined) {
        return fail(
          tableType === 'node'
            ? ElementCodes.NODE_NOT_FOUND
            : ElementCodes.EDGE_NOT_FOUND,
          elementId,
        )
      }
      return ok({ row: row as Record<AttributeName, ValueType> })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  createColumn(
    networkId,
    tableType,
    columnName,
    dataType,
    defaultValue,
  ): ApiResult {
    try {
      const tableRecord = useTableStore.getState().tables[networkId]
      if (tableRecord === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      const invalidName = validateColumnName(columnName, tableType)
      if (invalidName) return invalidName

      const duplicateName = validateColumnNameAvailable(
        tableRecord[tableKey(tableType)]?.columns ?? [],
        columnName,
      )
      if (duplicateName) return duplicateName

      const invalidDefault = validateColumnDefaultValue(defaultValue)
      if (invalidDefault) return invalidDefault

      if (!valueMatchesType(defaultValue, dataType)) {
        return fail(
          TableCodes.VALUE_TYPE_MISMATCH,
          columnName,
          dataType,
          JSON.stringify(defaultValue),
        )
      }

      useTableStore
        .getState()
        .createColumn(networkId, tableType, columnName, dataType, defaultValue)

      syncColumnToTableDisplayConfig(networkId, tableType, columnName)

      // No CREATE_COLUMN undo command exists (the in-app "Insert new column"
      // is not undoable either), so mark directly rather than through
      // corePostEdit.
      markNetworkModified(networkId)

      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  deleteColumn(networkId, tableType, columnName): ApiResult {
    try {
      const tableRecord = useTableStore.getState().tables[networkId]
      if (tableRecord === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      const columns = tableRecord[tableKey(tableType)]?.columns ?? []
      if (!columns.some((c) => c.name === columnName)) {
        return fail(AppCodes.COLUMN_NOT_FOUND, columnName, tableType)
      }

      // Recorded BEFORE the delete: the DELETE_COLUMN handler restores the
      // whole pre-delete table (`setTable`) on undo and re-deletes by
      // `params[3].id` on redo, which is the contract the in-app
      // DeleteTableColumnForm uses.
      const params = [
        networkId,
        tableType,
        tableRecord[tableKey(tableType)],
        { id: columnName },
      ]
      corePostEdit(
        networkId,
        UndoCommandType.DELETE_COLUMN,
        `Delete ${tableType} column ${columnName}`,
        params,
        params,
      )

      useTableStore.getState().deleteColumn(networkId, tableType, columnName)

      // Cascade: mappings referencing the column are deleted (CX2 RC3)
      cascadeColumnToMappings(networkId, tableType, columnName)

      updateTableDisplayConfigColumns(networkId, tableType, (cols) =>
        cols.filter((c) => c.attributeName !== columnName),
      )

      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  renameColumn(networkId, tableType, currentName, newName): ApiResult {
    try {
      const tableRecord = useTableStore.getState().tables[networkId]
      if (tableRecord === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      const invalidName = validateColumnName(newName, tableType)
      if (invalidName) return invalidName

      const columns = tableRecord[tableKey(tableType)]?.columns ?? []
      if (!columns.some((c) => c.name === currentName)) {
        return fail(AppCodes.COLUMN_NOT_FOUND, currentName, tableType)
      }

      // A self-rename is a no-op, and returning here is not just an
      // optimisation: falling through would record an undo entry, mark the
      // network modified, and rewrite every dependent mapping to the value it
      // already holds — three store writes for a rename that changes nothing.
      if (newName === currentName) {
        return ok()
      }

      const duplicateName = validateColumnNameAvailable(
        tableRecord[tableKey(tableType)]?.columns ?? [],
        newName,
      )
      if (duplicateName) return duplicateName

      // Undo swaps the names back; redo replays the rename.
      corePostEdit(
        networkId,
        UndoCommandType.RENAME_COLUMN,
        `Rename column '${currentName}' to '${newName}'`,
        [networkId, tableType, newName, currentName],
        [networkId, tableType, currentName, newName],
      )

      useTableStore
        .getState()
        .setColumnName(networkId, tableType, currentName, newName)

      // Cascade: mappings follow the rename so they never dangle (MI1)
      cascadeColumnToMappings(networkId, tableType, currentName, newName)

      updateTableDisplayConfigColumns(networkId, tableType, (cols) =>
        cols.map((c) =>
          c.attributeName === currentName
            ? { ...c, attributeName: newName }
            : c,
        ),
      )

      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  setValue(networkId, tableType, elementId, column, value): ApiResult {
    try {
      const tableRecord = useTableStore.getState().tables[networkId]
      if (tableRecord === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      const missing = validateTableElementsExist(networkId, tableType, [
        elementId,
      ])
      if (missing) return missing

      const typeMismatch = validateValuesMatchColumnTypes(
        tableRecord[tableKey(tableType)]?.columns ?? [],
        [{ column, value }],
      )
      if (typeMismatch) return typeMismatch

      const previousValue =
        tableRecord[tableKey(tableType)]?.rows.get(elementId)?.[column] ?? ''
      corePostEdit(
        networkId,
        UndoCommandType.SET_CELL_VALUE,
        'Set cell value',
        [networkId, tableType, elementId, column, previousValue],
        [networkId, tableType, elementId, column, value],
      )

      useTableStore
        .getState()
        .setValue(networkId, tableType as TableType, elementId, column, value)
      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  setValues(networkId, tableType, cellEdits): ApiResult {
    try {
      const tableRecord = useTableStore.getState().tables[networkId]
      if (tableRecord === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      const missing = validateTableElementsExist(
        networkId,
        tableType,
        cellEdits.map((edit) => edit.id),
      )
      if (missing) return missing

      const typeMismatch = validateValuesMatchColumnTypes(
        tableRecord[tableKey(tableType)]?.columns ?? [],
        cellEdits,
      )
      if (typeMismatch) return typeMismatch

      // Convert app API CellEdit {id, column, value} → store CellEdit {row, column, value}
      const storeCellEdits: StoreCellEdit[] = cellEdits.map((edit) => ({
        row: edit.id,
        column: edit.column,
        value: edit.value,
      }))
      // An empty edit list changes nothing, so it records nothing and leaves
      // the modified flag alone.
      if (storeCellEdits.length > 0) {
        corePostEdit(
          networkId,
          UndoCommandType.APPLY_VALUE_TO_SELECTED,
          'Set cell values',
          [
            networkId,
            tableType,
            previousCellEdits(tableRecord[tableKey(tableType)], storeCellEdits),
          ],
          [networkId, tableType, storeCellEdits],
        )
      }

      useTableStore
        .getState()
        .setValues(networkId, tableType as TableType, storeCellEdits)
      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  editRows(networkId, tableType, rows): ApiResult {
    try {
      const tableRecord = useTableStore.getState().tables[networkId]
      if (tableRecord === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      const missing = validateTableElementsExist(
        networkId,
        tableType,
        Object.keys(rows),
      )
      if (missing) return missing

      const typeMismatch = validateValuesMatchColumnTypes(
        tableRecord[tableKey(tableType)]?.columns ?? [],
        Object.values(rows).flatMap((row) =>
          Object.entries(row).map(([column, value]) => ({ column, value })),
        ),
      )
      if (typeMismatch) return typeMismatch

      // Convert app API Record<IdType, Record<...>> → store Map<IdType, Record<...>>
      const rowsMap = new Map<IdType, Record<AttributeName, ValueType>>(
        Object.entries(rows) as Array<
          [IdType, Record<AttributeName, ValueType>]
        >,
      )
      // Replayed as cell edits, not as rows: editRows has no undo command,
      // and the per-cell form restores exactly the cells this write touched.
      const editedCells: StoreCellEdit[] = Object.entries(rows).flatMap(
        ([row, values]) =>
          Object.entries(values).map(([column, value]) => ({
            row,
            column,
            value,
          })),
      )
      if (editedCells.length > 0) {
        corePostEdit(
          networkId,
          UndoCommandType.APPLY_VALUE_TO_SELECTED,
          'Edit table rows',
          [
            networkId,
            tableType,
            previousCellEdits(tableRecord[tableKey(tableType)], editedCells),
          ],
          [networkId, tableType, editedCells],
        )
      }

      useTableStore
        .getState()
        .editRows(networkId, tableType as TableType, rowsMap)
      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  applyValueToElements(
    networkId,
    tableType,
    columnName,
    value,
    elementIds,
  ): ApiResult {
    try {
      const tableRecord = useTableStore.getState().tables[networkId]
      if (tableRecord === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      if (elementIds !== undefined && elementIds.length > 0) {
        const missing = validateTableElementsExist(
          networkId,
          tableType,
          elementIds,
        )
        if (missing) return missing
      }
      const typeMismatch = validateValuesMatchColumnTypes(
        tableRecord[tableKey(tableType)]?.columns ?? [],
        [{ column: columnName, value }],
      )
      if (typeMismatch) return typeMismatch

      // The store applies to every row only when elementIds is OMITTED
      // (tableImpl.applyValueToElements branches on `!= null`); an empty
      // array selects nothing and writes nothing. The undo snapshot has to
      // cover exactly the rows the store will touch, so the two cases differ.
      const table = tableRecord[tableKey(tableType)]
      const appliesToEveryRow = elementIds === undefined
      const targetIds = appliesToEveryRow
        ? Array.from(table?.rows.keys() ?? [])
        : elementIds
      const appliedCells: StoreCellEdit[] = targetIds.map((row) => ({
        row,
        column: columnName,
        value,
      }))
      if (appliedCells.length > 0) {
        corePostEdit(
          networkId,
          appliesToEveryRow
            ? UndoCommandType.APPLY_VALUE_TO_COLUMN
            : UndoCommandType.APPLY_VALUE_TO_SELECTED,
          `Apply value to ${columnName}`,
          [networkId, tableType, previousCellEdits(table, appliedCells)],
          [networkId, tableType, appliedCells],
        )
      }

      useTableStore
        .getState()
        .applyValueToElements(
          networkId,
          tableType,
          columnName,
          value,
          elementIds,
        )
      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  // --- getColumns -------------------------------------------------------------

  getColumns(networkId, tableType): ApiResult<{ columns: ColumnInfo[] }> {
    try {
      const tableRecord = useTableStore.getState().tables[networkId]
      if (tableRecord === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      const table = tableRecord[tableKey(tableType)]
      const columns: ColumnInfo[] = []
      // Match getTable: edge tables report source/target pseudo-columns
      if (tableType === 'edge') {
        columns.push(
          { name: 'source', type: ValueTypeName.String },
          { name: 'target', type: ValueTypeName.String },
        )
      }
      for (const col of table?.columns ?? []) {
        columns.push({ name: col.name, type: col.type })
      }
      return ok({ columns })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  // --- getTable ---------------------------------------------------------------

  getTable(networkId, tableType, options) {
    try {
      const tableRecord = useTableStore.getState().tables[networkId]
      if (tableRecord === undefined) {
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      const table = tableRecord[tableKey(tableType)]
      const allColumns: Column[] = table?.columns ?? []
      const requestedCols = options?.columns
      const filteredColumns = requestedCols
        ? allColumns.filter((c) => requestedCols.includes(c.name))
        : allColumns
      const includeId = options?.includeId ?? true

      // For edge tables, prepend source/target from the network model
      const edgeLookup =
        tableType === 'edge' ? buildEdgeLookup(networkId) : undefined

      const rows: Array<Record<string, ValueType>> = []
      const tableRows = table?.rows
      if (tableRows) {
        tableRows.forEach(
          (rowData: Record<AttributeName, ValueType>, elementId: IdType) => {
            const row: Record<string, ValueType> = {}
            if (includeId) row['id'] = elementId
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

      // Build column info (id first, then source/target for edge table)
      const columnInfos: ColumnInfo[] = []
      if (includeId) {
        columnInfos.push({ name: 'id', type: ValueTypeName.String })
      }
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
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  // --- exportTableToTsv -------------------------------------------------------

  exportTableToTsv(networkId, tableType, options) {
    const result = tableApi.getTable(networkId, tableType, {
      columns: options?.columns,
      includeId: options?.includeId ?? true,
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
        return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
      }
      const table = tableRecord[tableKey(tableType)]
      const existingColumns = new Map(
        (table?.columns ?? []).map((c: Column) => [c.name, c.type]),
      )

      const lines = tsvText.split('\n').filter((l) => l.trim() !== '')
      if (lines.length < 2) {
        return fail(
          AppCodes.INVALID_INPUT,
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
          AppCodes.INVALID_INPUT,
          `Key column "${keyColumn}" not found in TSV header`,
        )
      }

      // Validate all new column names before mutating anything, so a
      // forbidden name (CX2 FK1/FK2/A8) fails the import cleanly instead
      // of leaving some columns created (same rules as createColumn)
      // `source`/`target` are structural on edge tables (synthesized from
      // the network model, never stored as columns) but are ordinary
      // attribute names on node tables, so the skip is edge-only
      const isStructuralColumn = (colName: string): boolean =>
        tableType === 'edge' && (colName === 'source' || colName === 'target')

      for (const colName of colNames) {
        if (colName === keyColumn) continue
        if (isStructuralColumn(colName)) continue
        if (existingColumns.has(colName)) continue
        const invalidName = validateColumnName(colName, tableType)
        if (invalidName) return invalidName
      }

      // Create any missing columns
      const newColumns: string[] = []
      const storeState = useTableStore.getState()
      for (const colName of colNames) {
        if (colName === keyColumn) continue
        if (isStructuralColumn(colName)) continue
        if (!existingColumns.has(colName)) {
          const inferredType =
            colTypes.get(colName) ?? inferTypeFromData(lines, colNames, colName)
          storeState.createColumn(
            networkId,
            tableType,
            colName,
            inferredType,
            defaultForType(inferredType),
          )
          // Record the type so cell values parse as the column type
          // (previously fell back to string for inferred columns)
          colTypes.set(colName, inferredType)
          newColumns.push(colName)
          // Sync to Table Browser display config
          syncColumnToTableDisplayConfig(networkId, tableType, colName)
        }
      }

      // Resolve TSV key values to element IDs so imports can never
      // create orphaned rows: 'id' keys must exist in the network;
      // custom keys are looked up in the existing table rows.
      const network = useNetworkStore.getState().networks.get(networkId)
      const knownIds = new Set<IdType>(
        (tableType === 'node' ? network?.nodes : network?.edges)?.map(
          (el: { id: IdType }) => el.id,
        ) ?? [],
      )
      let resolveKey: (value: string) => IdType[]
      if (keyColumn === 'id') {
        resolveKey = (value) => (knownIds.has(value) ? [value] : [])
      } else {
        const valueToIds = new Map<string, IdType[]>()
        table?.rows?.forEach(
          (rowData: Record<AttributeName, ValueType>, elementId: IdType) => {
            const keyValue = rowData[keyColumn]
            if (keyValue === undefined || !knownIds.has(elementId)) return
            const ids = valueToIds.get(String(keyValue))
            if (ids) {
              ids.push(elementId)
            } else {
              valueToIds.set(String(keyValue), [elementId])
            }
          },
        )
        resolveKey = (value) => valueToIds.get(value) ?? []
      }

      // Build cell edits — only touch the columns present in the TSV,
      // preserving all existing attributes. Uses setValues (batch cell edit)
      // instead of editRows (full row replace) for performance: avoids
      // copying all ~20 attributes per row × 330 rows.
      const cellEdits: Array<{
        row: IdType
        column: AttributeName
        value: ValueType
      }> = []
      const skippedRows: string[] = []
      const skippedCells: Array<{
        key: string
        column: string
        value: string
      }> = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split('\t')
        const keyValue = values[keyIndex]
        if (!keyValue) continue
        const targetIds = resolveKey(keyValue)
        if (targetIds.length === 0) {
          skippedRows.push(keyValue)
          continue
        }
        for (let j = 0; j < colNames.length; j++) {
          const colName = colNames[j]
          if (colName === keyColumn) continue
          if (isStructuralColumn(colName)) continue
          const rawValue = values[j] ?? ''
          const colType = (colTypes.get(colName) ??
            existingColumns.get(colName) ??
            'string') as ValueTypeName
          // Empty cells mean "no value provided" — leave the attribute alone
          if (rawValue === '' && colType !== ValueTypeName.String) continue
          const parsedValue = parseTsvValue(rawValue, colType)
          if (parsedValue === undefined) {
            // Unparseable for the column type — skip and report rather
            // than silently coercing (matches the strict no-coercion
            // policy of setValue/setValues)
            skippedCells.push({
              key: keyValue,
              column: colName,
              value: rawValue,
            })
            continue
          }
          for (const targetId of targetIds) {
            cellEdits.push({
              row: targetId,
              column: colName,
              value: parsedValue,
            })
          }
        }
      }

      storeState.setValues(networkId, tableType, cellEdits)

      // No undo entry: the import both creates columns and writes cells, and
      // no single undo command covers both. Recording only the cell edits
      // would restore the values and leave the new columns behind, which is
      // worse than leaving the operation outside the stack (the in-app
      // "Join table to network" path is not undoable either).
      //
      // Marked only when something actually changed — an import whose every
      // key missed the network leaves the data untouched.
      if (newColumns.length > 0 || cellEdits.length > 0) {
        markNetworkModified(networkId)
      }

      // Count unique row IDs from cell edits
      const uniqueRows = new Set(cellEdits.map((e) => e.row))
      return ok({
        rowCount: uniqueRows.size,
        newColumns,
        skippedRows,
        skippedCells,
      })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
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

/** Default cell value for a newly created column of the given type */
function defaultForType(type: ValueTypeName): ValueType {
  switch (type) {
    case ValueTypeName.Long:
    case ValueTypeName.Integer:
    case ValueTypeName.Double:
      return 0
    case ValueTypeName.Boolean:
      return false
    case ValueTypeName.ListString:
    case ValueTypeName.ListLong:
    case ValueTypeName.ListInteger:
    case ValueTypeName.ListDouble:
    case ValueTypeName.ListBoolean:
      return []
    default:
      return ''
  }
}

const INTEGER_PATTERN = /^-?\d+$/

function parseIntStrict(raw: string): number | undefined {
  return INTEGER_PATTERN.test(raw.trim()) ? parseInt(raw.trim(), 10) : undefined
}

function parseFloatStrict(raw: string): number | undefined {
  const n = Number(raw.trim())
  return raw.trim() !== '' && Number.isFinite(n) ? n : undefined
}

function parseBooleanStrict(raw: string): boolean | undefined {
  const lower = raw.trim().toLowerCase()
  if (lower === 'true') return true
  if (lower === 'false') return false
  return undefined
}

/** Map each list element; undefined if any element fails to parse */
function parseList<T>(
  raw: string,
  parseElement: (s: string) => T | undefined,
): T[] | undefined {
  const parsed = raw.split('|').map(parseElement)
  return parsed.every((v) => v !== undefined) ? (parsed as T[]) : undefined
}

/**
 * Parse a TSV cell value according to its type — strict, no coercion.
 * Returns undefined when the raw text cannot represent the type, so the
 * caller can skip and report the cell (CX2 A1: values must match the
 * declared column type).
 */
function parseTsvValue(
  raw: string,
  type: ValueTypeName,
): ValueType | undefined {
  switch (type) {
    case ValueTypeName.Long:
    case ValueTypeName.Integer:
      return parseIntStrict(raw)
    case ValueTypeName.Double:
      return parseFloatStrict(raw)
    case ValueTypeName.Boolean:
      return parseBooleanStrict(raw)
    case ValueTypeName.ListString:
      return raw.split('|')
    case ValueTypeName.ListLong:
    case ValueTypeName.ListInteger:
      return parseList(raw, parseIntStrict)
    case ValueTypeName.ListDouble:
      return parseList(raw, parseFloatStrict)
    case ValueTypeName.ListBoolean:
      return parseList(raw, parseBooleanStrict)
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
