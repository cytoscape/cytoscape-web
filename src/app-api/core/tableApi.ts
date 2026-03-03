// src/app-api/core/tableApi.ts
// Framework-agnostic Table API core — zero React imports.
// All store access via .getState(); no React hook subscriptions.

import { useTableStore } from '../../data/hooks/stores/TableStore'
import { IdType } from '../../models/IdType'
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
}
