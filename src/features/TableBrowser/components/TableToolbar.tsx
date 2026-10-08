import { Box, Button, Tooltip } from '@mui/material'
import React from 'react'
import { CompactSelection, GridSelection } from '@glideapps/glide-data-grid'

import { IdType } from '../../../models/IdType'
import { Table, ValueType, ValueTypeName } from '../../../models/TableModel'
import { UndoCommandType } from '../../../models/StoreModel/UndoStoreModel'
import { TableDisplayConfiguration } from '../../../models/VisualStyleModel/VisualStyleOptions'
import { CellEdit } from '../../../models/StoreModel/TableStoreModel'
import {
  deserializeValue,
  serializedStringIsValid,
} from '../../../models/TableModel/impl/valueTypeImpl'
import { useJoinTableToNetworkStore } from '../../TableDataLoader/store/joinTableToNetworkStore'
import { VisualProperty } from '../../../models/VisualStyleModel'

import {
  CreateTableColumnForm,
  DeleteTableColumnForm,
  EditTableColumnForm,
} from '../TableColumnForm'

// --- Helper Components ---
const ButtonTooltip = ({
  title,
  children,
}: {
  title: string
  children: React.ReactElement
}) => (
  <Tooltip
    title={title}
    placement="top"
    PopperProps={{
      modifiers: [
        {
          name: 'offset',
          options: {
            offset: [0, -16],
          },
        },
      ],
    }}
  >
    {children}
  </Tooltip>
)

const ToolbarIconButton = ({
  title,
  disabled = false,
  onClick,
  testId,
  children,
}: {
  title: string
  disabled?: boolean
  onClick: () => void
  testId?: string
  children: React.ReactElement
}) => (
  <ButtonTooltip title={title}>
    <span>
      <Button
        data-testid={testId}
        disabled={disabled}
        onClick={onClick}
        sx={{
          minWidth: 48,
          maxWidth: 48,
          height: 48,
          p: 0,
          color: (theme) => theme.palette.text.primary,
        }}
      >
        {children}
      </Button>
    </span>
  </ButtonTooltip>
)

const ToolbarTextButton = ({
  onClick,
  testId,
  children,
}: {
  onClick: () => void
  testId?: string
  children: React.ReactNode
}) => (
  <Button
    data-testid={testId}
    variant="outlined"
    size="small"
    onClick={onClick}
    sx={{
      textTransform: 'none',
      color: (theme) => theme.palette.text.primary,
      borderColor: (theme) => theme.palette.text.secondary,
      borderRadius: 4,
    }}
  >
    {children}
  </Button>
)

export interface TableToolbarProps {
  currentNetworkId: IdType
  currentTable: Table | undefined
  nodeTable: Table | undefined
  edgeTable: Table | undefined
  tables: Record<string, any>
  selection: GridSelection
  setSelection: (selection: GridSelection) => void
  rows: any[] | undefined
  allColumns: any[] | undefined
  tableDisplayConfiguration: TableDisplayConfiguration | undefined
  createUpdatedTableDisplayConfiguration: (
    config: any,
  ) => TableDisplayConfiguration
  setTableDisplayConfiguration: (
    networkId: IdType,
    config: TableDisplayConfiguration,
  ) => void
  /**
   * Sort, duplicate and insert-column record no undo entry, so they mark the
   * network themselves. Every other write in this toolbar is marked by
   * `postEdit` (#680).
   */
  setNetworkModified: (networkId: IdType, modified: boolean) => void
  postEdit: (
    type: UndoCommandType,
    desc: string,
    undo: any[],
    redo: any[],
  ) => void
  addColumn: (
    networkId: IdType,
    tableType: 'node' | 'edge',
    colName: string,
    dataType: ValueTypeName,
    defValue: any,
  ) => void
  deleteColumn: (
    networkId: IdType,
    tableType: 'node' | 'edge',
    colName: string,
  ) => void
  setColumnName: (
    networkId: IdType,
    tableType: 'node' | 'edge',
    oldName: string,
    newName: string,
  ) => void
  applyValueToElements: (
    networkId: IdType,
    tableType: 'node' | 'edge',
    colKey: string,
    val: any,
    elements?: string[],
  ) => void
  exclusiveSelect: (
    networkId: IdType,
    nodeIds: string[],
    edgeIds: string[],
  ) => void
  visualPropertiesDependentOnSelectedColumn: VisualProperty<any>[]
  setMapping: (networkId: IdType, vpName: any, mapping: any) => void
  setSort: (sort: any) => void
  duplicateColumn: (
    networkId: IdType,
    tableType: 'node' | 'edge',
    colName: string,
  ) => void
  columns: any[]
}

export const TableToolbar: React.FC<TableToolbarProps> = ({
  currentNetworkId,
  currentTable,
  nodeTable,
  edgeTable,
  tables,
  selection,
  setSelection,
  rows,
  allColumns,
  tableDisplayConfiguration,
  createUpdatedTableDisplayConfiguration,
  setTableDisplayConfiguration,
  setNetworkModified,
  postEdit,
  addColumn,
  deleteColumn,
  setColumnName,
  applyValueToElements,
  exclusiveSelect,
  visualPropertiesDependentOnSelectedColumn,
  setMapping,
  setSort,
  duplicateColumn,
  columns,
}) => {
  const showTableJoinForm = useJoinTableToNetworkStore(
    (state: any) => state.setShow,
  )

  // Modals state
  const [showCreateColumnForm, setShowCreateColumnForm] = React.useState(false)
  const [createColumnFormError, setCreateColumnFormError] = React.useState<
    string | undefined
  >(undefined)
  const [showEditColumnForm, setShowEditColumnForm] = React.useState(false)
  const [columnFormError, setColumnFormError] = React.useState<
    string | undefined
  >(undefined)
  const [showDeleteColumnForm, setShowDeleteColumnForm] = React.useState(false)
  const [deleteColumnFormError, setDeleteColumnFormError] = React.useState<
    string | undefined
  >(undefined)

  // Derived state
  const selectedColumnIndex = selection.columns.first()
  const selectedColumn =
    selectedColumnIndex !== undefined && allColumns != null
      ? allColumns[selectedColumnIndex]
      : null

  const selectedCell = selection.current?.cell ?? null
  const isSelectedCellVirtual =
    selectedCell != null &&
    allColumns?.[selectedCell[0]] &&
    (allColumns[selectedCell[0]] as any).isVirtual

  const selectedColumnToolbar =
    selectedColumnIndex !== undefined &&
    selectedColumn != null &&
    !(selectedColumn as any).isVirtual ? (
      <>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            ml: 2,
            backgroundColor: 'transparent',
          }}
        >
          <ToolbarTextButton
            testId="table-toolbar-sort-asc-button"
            onClick={() => {
              if (selectedColumn != null) {
                const columnKey = selectedColumn.id
                const columnType = selectedColumn.type
                setSort({
                  column: columnKey,
                  direction: 'asc',
                  valueType: columnType,
                })
                const newTableDisplayConfiguration =
                  createUpdatedTableDisplayConfiguration({
                    sortColumn: columnKey,
                    sortDirection: 'ascending',
                  })
                setTableDisplayConfiguration(
                  currentNetworkId,
                  newTableDisplayConfiguration,
                )
                setNetworkModified(currentNetworkId, true)
              }
            }}
          >
            Sort Asc
          </ToolbarTextButton>
          <ToolbarTextButton
            testId="table-toolbar-sort-desc-button"
            onClick={() => {
              if (selectedColumn != null) {
                const columnKey = selectedColumn.id
                const columnType = selectedColumn.type
                setSort({
                  column: columnKey,
                  direction: 'desc',
                  valueType: columnType,
                })
                const newTableDisplayConfiguration =
                  createUpdatedTableDisplayConfiguration({
                    sortColumn: columnKey,
                    sortDirection: 'descending',
                  })
                setTableDisplayConfiguration(
                  currentNetworkId,
                  newTableDisplayConfiguration,
                )
                setNetworkModified(currentNetworkId, true)
              }
            }}
          >
            Sort Desc
          </ToolbarTextButton>
          <ToolbarTextButton
            testId="table-toolbar-duplicate-column-button"
            onClick={() => {
              if (
                selectedColumn !== null &&
                !(selectedColumn as any)?.isVirtual
              ) {
                const columnKey = selectedColumn.id
                duplicateColumn(
                  currentNetworkId,
                  currentTable === nodeTable ? 'node' : 'edge',
                  columnKey,
                )
                setNetworkModified(currentNetworkId, true)
                setSelection({
                  ...selection,
                  columns: CompactSelection.fromSingleSelection(
                    selectedColumn.index + 1,
                  ),
                })

                const defaultConfig = {
                  columnConfiguration:
                    (currentTable === nodeTable
                      ? nodeTable
                      : edgeTable
                    )?.columns?.map((col: any) => ({
                      attributeName: col.name,
                      visible: true,
                      columnWidth: undefined,
                    })) ?? [],
                  sortColumn: undefined,
                  sortDirection: undefined,
                }
                const currentConfig =
                  currentTable === nodeTable
                    ? (tableDisplayConfiguration?.nodeTable ?? defaultConfig)
                    : (tableDisplayConfiguration?.edgeTable ?? defaultConfig)
                const duplicatedCol = currentConfig.columnConfiguration.find(
                  (col: any) => col.attributeName === columnKey,
                )
                const allColumnNames = columns.map((c: any) => c.id)
                const originalIndex = allColumnNames.indexOf(columnKey)
                const newColumnName = allColumnNames[originalIndex + 1]
                if (duplicatedCol && newColumnName) {
                  const newColConfig = [
                    ...currentConfig.columnConfiguration.slice(
                      0,
                      originalIndex + 1,
                    ),
                    { ...duplicatedCol, attributeName: newColumnName },
                    ...currentConfig.columnConfiguration.slice(
                      originalIndex + 1,
                    ),
                  ]
                  const newTableDisplayConfiguration =
                    createUpdatedTableDisplayConfiguration({
                      columnConfiguration: newColConfig,
                    })
                  setTableDisplayConfiguration(
                    currentNetworkId,
                    newTableDisplayConfiguration,
                  )
                  setNetworkModified(currentNetworkId, true)
                }
              }
            }}
          >
            Duplicate
          </ToolbarTextButton>
          <ToolbarTextButton
            testId="table-toolbar-edit-column-button"
            onClick={() => setShowEditColumnForm(true)}
          >
            Edit Column Name
          </ToolbarTextButton>
          <ToolbarTextButton
            testId="table-toolbar-delete-column-button"
            onClick={() => setShowDeleteColumnForm(true)}
          >
            Delete Column
          </ToolbarTextButton>
        </Box>
        <EditTableColumnForm
          error={columnFormError}
          dependentVisualProperties={visualPropertiesDependentOnSelectedColumn}
          open={showEditColumnForm}
          column={selectedColumn}
          onClose={() => {
            setShowEditColumnForm(false)
            setColumnFormError(undefined)
          }}
          onSubmit={(
            newColumnName: string,
            mappingUpdateType?: 'delete' | 'rename',
          ) => {
            if (
              currentTable?.columns?.find((c: any) => c.name === newColumnName)
            ) {
              setColumnFormError(
                `${newColumnName} already exists. Please enter a new unique column name`,
              )
            } else {
              postEdit(
                UndoCommandType.RENAME_COLUMN,
                `Rename column '${selectedColumn.title}' to '${newColumnName}'`,
                [
                  currentNetworkId,
                  currentTable === nodeTable ? 'node' : 'edge',
                  newColumnName,
                  selectedColumn.id,
                ],
                [
                  currentNetworkId,
                  currentTable === nodeTable ? 'node' : 'edge',
                  selectedColumn.id,
                  newColumnName,
                ],
              )
              setColumnName(
                currentNetworkId,
                currentTable === nodeTable ? 'node' : 'edge',
                selectedColumn.id,
                newColumnName,
              )

              const defaultConfig = {
                columnConfiguration:
                  (currentTable === nodeTable
                    ? nodeTable
                    : edgeTable
                  )?.columns?.map((col: any) => ({
                    attributeName: col.name,
                    visible: true,
                    columnWidth: undefined,
                  })) ?? [],
                sortColumn: undefined,
                sortDirection: undefined,
              }
              const currentConfig =
                currentTable === nodeTable
                  ? (tableDisplayConfiguration?.nodeTable ?? defaultConfig)
                  : (tableDisplayConfiguration?.edgeTable ?? defaultConfig)
              const newColumnConfig = currentConfig.columnConfiguration.map(
                (col: any) =>
                  col.attributeName === selectedColumn.id
                    ? { ...col, attributeName: newColumnName }
                    : col,
              )
              const newTableDisplayConfiguration =
                createUpdatedTableDisplayConfiguration({
                  columnConfiguration: newColumnConfig,
                })
              setTableDisplayConfiguration(
                currentNetworkId,
                newTableDisplayConfiguration,
              )

              if (mappingUpdateType === 'rename') {
                visualPropertiesDependentOnSelectedColumn.forEach((vp) => {
                  if (vp.mapping != null) {
                    setMapping(currentNetworkId, vp.name, {
                      ...vp.mapping,
                      attribute: newColumnName,
                    })
                  }
                })
              } else if (mappingUpdateType === 'delete') {
                visualPropertiesDependentOnSelectedColumn.forEach((vp) => {
                  setMapping(currentNetworkId, vp.name, undefined)
                })
              }
              setColumnFormError(undefined)
              setShowEditColumnForm(false)
            }
          }}
        />
        <DeleteTableColumnForm
          error={deleteColumnFormError}
          dependentVisualProperties={visualPropertiesDependentOnSelectedColumn}
          open={showDeleteColumnForm}
          column={selectedColumn}
          onClose={() => {
            setShowDeleteColumnForm(false)
            setDeleteColumnFormError(undefined)
          }}
          onSubmit={(mappingUpdateType?: 'delete') => {
            postEdit(
              UndoCommandType.DELETE_COLUMN,
              `Delete ${currentTable === nodeTable ? 'node' : 'edge'} column ${selectedColumn.title}`,
              [
                currentNetworkId,
                currentTable === nodeTable ? 'node' : 'edge',
                currentTable,
                selectedColumn,
              ],
              [
                currentNetworkId,
                currentTable === nodeTable ? 'node' : 'edge',
                currentTable,
                selectedColumn,
              ],
            )
            deleteColumn(
              currentNetworkId,
              currentTable === nodeTable ? 'node' : 'edge',
              selectedColumn.id,
            )

            const defaultConfig = {
              columnConfiguration:
                (currentTable === nodeTable
                  ? nodeTable
                  : edgeTable
                )?.columns?.map((col: any) => ({
                  attributeName: col.name,
                  visible: true,
                  columnWidth: undefined,
                })) ?? [],
              sortColumn: undefined,
              sortDirection: undefined,
            }
            const currentConfig =
              currentTable === nodeTable
                ? (tableDisplayConfiguration?.nodeTable ?? defaultConfig)
                : (tableDisplayConfiguration?.edgeTable ?? defaultConfig)
            const newColumnConfig = currentConfig.columnConfiguration.filter(
              (col: any) => col.attributeName !== selectedColumn.id,
            )
            const newTableDisplayConfiguration =
              createUpdatedTableDisplayConfiguration({
                columnConfiguration: newColumnConfig,
              })
            setTableDisplayConfiguration(
              currentNetworkId,
              newTableDisplayConfiguration,
            )

            if (mappingUpdateType === 'delete') {
              visualPropertiesDependentOnSelectedColumn.forEach((vp) => {
                setMapping(currentNetworkId, vp.name, undefined)
              })
            }
            setShowDeleteColumnForm(false)
            setDeleteColumnFormError(undefined)
            setSelection({
              columns: CompactSelection.empty(),
              rows: CompactSelection.empty(),
            })
          }}
        />
      </>
    ) : null

  const selectedCellToolbar =
    selectedCell != null && !isSelectedCellVirtual ? (
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          ml: 2,
          backgroundColor: 'transparent',
          minWidth: '540px',
        }}
      >
        <ToolbarTextButton
          testId="table-toolbar-apply-value-to-column-button"
          onClick={() => {
            const [columnIndex, rowIndex] = selectedCell
            const rowData = rows?.[rowIndex]
            const column = allColumns?.[columnIndex]
            if (rowData == null || column == null) return
            const columnKey = column.id
            const cellValue = (rowData as any)?.[columnKey]
            const cellEdits: CellEdit[] = []
            const prevColumnValues: CellEdit[] = []
            Array.from(currentTable?.rows.entries() || []).map(([k, v]) => {
              cellEdits.push({ row: k, column: columnKey, value: cellValue })
              prevColumnValues.push({
                row: k,
                column: columnKey,
                value: (v as any)?.[columnKey] as ValueType,
              })
            })
            postEdit(
              UndoCommandType.APPLY_VALUE_TO_COLUMN,
              'Apply value to column',
              [
                currentNetworkId,
                currentTable === nodeTable ? 'node' : 'edge',
                prevColumnValues,
              ],
              [
                currentNetworkId,
                currentTable === nodeTable ? 'node' : 'edge',
                cellEdits,
              ],
            )
            applyValueToElements(
              currentNetworkId,
              currentTable === nodeTable ? 'node' : 'edge',
              columnKey,
              cellValue,
            )
          }}
        >
          Apply Value to Column
        </ToolbarTextButton>
        <ToolbarTextButton
          testId="table-toolbar-apply-value-to-selected-button"
          onClick={() => {
            const [columnIndex, rowIndex] = selectedCell
            const rowData = rows?.[rowIndex]
            const column = allColumns?.[columnIndex]
            if (rowData == null || column == null) return
            const columnKey = column.id
            const cellValue = (rowData as any)?.[columnKey]
            const cellEdits: CellEdit[] = []
            const prevColumnValues: CellEdit[] = []

            rows?.forEach((r) => {
              const rowId = r.id
              cellEdits.push({
                row: rowId,
                column: columnKey,
                value: cellValue,
              })
              prevColumnValues.push({
                row: rowId,
                column: columnKey,
                value: (r as any)?.[columnKey] as ValueType,
              })
            })

            postEdit(
              UndoCommandType.APPLY_VALUE_TO_SELECTED,
              'Apply value to selected elements',
              [
                currentNetworkId,
                currentTable === nodeTable ? 'node' : 'edge',
                prevColumnValues,
              ],
              [
                currentNetworkId,
                currentTable === nodeTable ? 'node' : 'edge',
                cellEdits,
              ],
            )
            applyValueToElements(
              currentNetworkId,
              currentTable === nodeTable ? 'node' : 'edge',
              columnKey,
              cellValue,
              rows?.map((r) => r.id),
            )
          }}
        >
          {`Apply Value to Selected ${currentTable === nodeTable ? 'Nodes' : 'Edges'}`}
        </ToolbarTextButton>
      </Box>
    ) : null

  const selectedRowToolbar =
    selection.rows.length > 0 ? (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          ml: 2,
          backgroundColor: 'transparent',
        }}
      >
        <ToolbarTextButton
          testId="table-toolbar-select-elements-button"
          onClick={() => {
            const rowsToSelect = selection.rows.toArray()
            const rowIds = rowsToSelect
              .map((r) => rows?.[r].id)
              .filter((id) => id !== undefined)
            if (currentTable === nodeTable) {
              exclusiveSelect(currentNetworkId, rowIds, [])
            } else {
              exclusiveSelect(currentNetworkId, [], rowIds)
            }
            setSelection({ ...selection, rows: CompactSelection.empty() })
          }}
        >
          {`Select ${currentTable === nodeTable ? 'Nodes' : 'Edges'}`}
        </ToolbarTextButton>
      </Box>
    ) : null

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        ml: 1,
        backgroundColor: 'transparent',
      }}
    >
      <ToolbarIconButton
        testId="insert-column-button"
        title="Insert new column"
        disabled={tables[currentNetworkId] === undefined}
        onClick={() => setShowCreateColumnForm(true)}
      >
        <span className="icon">&#8209;</span>
      </ToolbarIconButton>
      <ToolbarIconButton
        testId="import-table-button"
        title="Import table from file..."
        disabled={tables[currentNetworkId] === undefined}
        onClick={() => showTableJoinForm(true)}
      >
        <span className="icon">&#44;</span>
      </ToolbarIconButton>
      <CreateTableColumnForm
        error={createColumnFormError}
        open={showCreateColumnForm}
        onClose={() => {
          setShowCreateColumnForm(false)
          setCreateColumnFormError(undefined)
        }}
        onSubmit={(
          columnName: string,
          dataType: ValueTypeName,
          value: string,
        ) => {
          const columnNameSet = new Set(columns?.map((c: any) => c.name))
          const columnNameAlreadyExists = columnNameSet.has(columnName)
          const valueIsValid = serializedStringIsValid(dataType, value)
          if (columnNameAlreadyExists) {
            setCreateColumnFormError(
              `${columnName} already exists. Please enter a new unique column name`,
            )
          } else {
            if (!valueIsValid) {
              setCreateColumnFormError(
                `Default value ${value} is not a valid ${dataType}. Please enter a valid ${dataType}`,
              )
            } else {
              const valueType = deserializeValue(dataType, value)
              addColumn(
                currentNetworkId,
                currentTable === nodeTable ? 'node' : 'edge',
                columnName,
                dataType,
                valueType,
              )
              setNetworkModified(currentNetworkId, true)

              const defaultConfig = {
                columnConfiguration:
                  (currentTable === nodeTable
                    ? nodeTable
                    : edgeTable
                  )?.columns?.map((col: any) => ({
                    attributeName: col.name,
                    visible: true,
                    columnWidth: undefined,
                  })) ?? [],
                sortColumn: undefined,
                sortDirection: undefined,
              }
              const currentConfig =
                currentTable === nodeTable
                  ? (tableDisplayConfiguration?.nodeTable ?? defaultConfig)
                  : (tableDisplayConfiguration?.edgeTable ?? defaultConfig)
              const newColumnConfig = [
                {
                  attributeName: columnName,
                  visible: true,
                  columnWidth: undefined,
                },
                ...currentConfig.columnConfiguration,
              ]
              const newTableDisplayConfiguration =
                createUpdatedTableDisplayConfiguration({
                  columnConfiguration: newColumnConfig,
                })
              setTableDisplayConfiguration(
                currentNetworkId,
                newTableDisplayConfiguration,
              )
              setNetworkModified(currentNetworkId, true)

              setCreateColumnFormError(undefined)
              setSelection({
                ...selection,
                columns: CompactSelection.fromSingleSelection(0),
              })
              setShowCreateColumnForm(false)
            }
          }
        }}
      />
      {selectedColumnToolbar}
      {selectedCellToolbar}
      {selectedRowToolbar}
    </Box>
  )
}
